import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { PasswordService } from '../auth/services/password.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService, PasswordService],
})
export class UserModule {}
