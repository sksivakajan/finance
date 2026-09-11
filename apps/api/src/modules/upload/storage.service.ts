import fs from 'node:fs/promises';
import path from 'node:path';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';

interface StoredFile {
  body: Buffer;
  contentType?: string;
}

@Injectable()
export class StorageService {
  private readonly localRoot: string;
  private readonly s3: S3Client | null;

  constructor(private readonly env: EnvService) {
    this.localRoot = path.resolve(
      process.cwd(),
      this.env.values.STORAGE_LOCAL_PATH,
    );
    this.s3 =
      this.env.values.STORAGE_DRIVER === 's3'
        ? new S3Client({
            region: this.env.values.STORAGE_S3_REGION,
            endpoint: this.env.values.STORAGE_S3_ENDPOINT,
            forcePathStyle: true,
            credentials: {
              accessKeyId: this.env.values.STORAGE_S3_ACCESS_KEY_ID!,
              secretAccessKey: this.env.values.STORAGE_S3_SECRET_ACCESS_KEY!,
            },
          })
        : null;
  }

  async put(
    userId: string,
    filename: string,
    body: Buffer,
    contentType: string,
  ) {
    if (this.env.values.STORAGE_DRIVER === 'local') {
      const dir = path.join(this.localRoot, userId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), body, { flag: 'wx' });
      return;
    }

    try {
      await this.s3!.send(
        new PutObjectCommand({
          Bucket: this.env.values.STORAGE_S3_BUCKET,
          Key: this.objectKey(userId, filename),
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch {
      this.unavailable();
    }
  }

  async get(userId: string, filename: string): Promise<StoredFile> {
    if (this.env.values.STORAGE_DRIVER === 'local') {
      try {
        return {
          body: await fs.readFile(path.join(this.localRoot, userId, filename)),
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') this.notFound();
        throw error;
      }
    }

    try {
      const object = await this.s3!.send(
        new GetObjectCommand({
          Bucket: this.env.values.STORAGE_S3_BUCKET,
          Key: this.objectKey(userId, filename),
        }),
      );
      if (!object.Body) this.notFound();
      return {
        body: Buffer.from(await object.Body.transformToByteArray()),
        contentType: object.ContentType,
      };
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      ) {
        this.notFound();
      }
      this.unavailable();
    }
  }

  private objectKey(userId: string, filename: string) {
    return `${userId}/${filename}`;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'FILE_NOT_FOUND',
      message: 'File not found.',
    });
  }

  private unavailable(): never {
    throw new InternalServerErrorException({
      code: 'STORAGE_UNAVAILABLE',
      message: 'File storage is temporarily unavailable.',
    });
  }
}
