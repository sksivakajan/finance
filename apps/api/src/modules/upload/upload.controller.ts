import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';
import { StorageService } from './storage.service.js';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const SAFE_FILENAME = /^[a-f0-9]{32}\.[a-z0-9]+$/;
const SAFE_USER_ID = /^[a-zA-Z0-9_-]+$/;

@Controller('uploads')
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!(file.mimetype in ALLOWED_MIME_TYPES)) {
          cb(
            new BadRequestException({
              code: 'UNSUPPORTED_FILE_TYPE',
              message:
                'Only JPEG, PNG, WEBP, HEIC images or PDF receipts are allowed.',
            }),
            false,
          );
          return;
        }
        cb(null, true);
      },
      storage: memoryStorage(),
    }),
  )
  async upload(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'No file was uploaded.',
      });
    }
    const filename = `${randomBytes(16).toString('hex')}${ALLOWED_MIME_TYPES[file.mimetype]}`;
    await this.storage.put(user.sub, filename, file.buffer, file.mimetype);
    return { url: `/uploads/${user.sub}/${filename}` };
  }

  // Files are served through the same-origin proxy for both local and S3 storage.
  @Public()
  @Get(':userId/:filename')
  async serve(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!SAFE_USER_ID.test(userId) || !SAFE_FILENAME.test(filename)) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found.',
      });
    }
    const file = await this.storage.get(userId, filename);
    if (file.contentType) res.type(file.contentType);
    res.send(file.body);
  }
}
