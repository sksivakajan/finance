import { randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
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
import { diskStorage } from 'multer';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';

// Receipts/attachments only for now (spec §29 "secure file uploads, file type
// validation"). Extend this allowlist deliberately, not by relaxing it.
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// Read directly from process.env (already populated by main.ts's dotenv load
// before Nest bootstraps): multer's storage config is built once at module-
// load time via the @UseInterceptors decorator, before Nest's DI container
// exists, so an injected EnvService isn't reachable here.
const UPLOADS_ROOT = path.resolve(
  process.cwd(),
  process.env.STORAGE_LOCAL_PATH ?? './uploads',
);
// Matches the filenames this controller itself generates below — never
// trust a filename coming back from the client/URL beyond this shape, or a
// path-traversal payload like "../../etc/passwd" becomes reachable.
const SAFE_FILENAME = /^[a-f0-9]{32}\.[a-z0-9]+$/;
const SAFE_USER_ID = /^[a-zA-Z0-9_-]+$/;

@Controller('uploads')
export class UploadController {
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
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access --
       * multer's own module has no bundled types; src/types/multer.d.ts
       * supplies enough for `tsc` (verified clean via tsc -p tsconfig.build.json),
       * but typescript-eslint's separate resolution doesn't pick up the
       * ambient module augmentation here. Delete this block once
       * @types/multer is installed (blocked on registry access at the time
       * of writing) and the ambient declaration file is removed. */
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const user = (req as Request & { user: AccessTokenPayload }).user;
          const dir = path.join(UPLOADS_ROOT, user.sub);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        // Unguessable key per docs/BLUEPRINT.md §29 ("object storage keys are
        // unguessable") — never the client-supplied original filename.
        filename: (_req, file, cb) => {
          cb(
            null,
            `${randomBytes(16).toString('hex')}${ALLOWED_MIME_TYPES[file.mimetype]}`,
          );
        },
      }),
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }),
  )
  upload(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'NO_FILE',
        message: 'No file was uploaded.',
      });
    }
    return { url: `/uploads/${user.sub}/${file.filename}` };
  }

  // Deliberately @Public(): an <img src> can't attach an Authorization
  // header, so this can't sit behind the JWT guard the way every other
  // route does. Access control instead comes from the URL itself being
  // unguessable — a 32-hex-char (128-bit) random filename per
  // docs/BLUEPRINT.md §29's "object storage keys are unguessable" — the
  // same trust model as an S3 presigned URL or a Cloudinary asset link.
  // Enumeration is infeasible; the /:userId/ segment groups files per user
  // but grants no additional access on its own, so it's read-only routing,
  // not an authorization boundary. Path-traversal is still checked below.
  @Public()
  @Get(':userId/:filename')
  serve(
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
    const filePath = path.join(UPLOADS_ROOT, userId, filename);
    if (!filePath.startsWith(path.join(UPLOADS_ROOT, userId))) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found.',
      });
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found.',
      });
    }
    res.sendFile(filePath);
  }
}
