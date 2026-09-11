import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller.js';
import { StorageService } from './storage.service.js';

@Module({
  controllers: [UploadController],
  providers: [StorageService],
})
export class UploadModule {}
