import { Body, Controller, Delete, Get, Patch, Query } from '@nestjs/common';
import {
  updateProfileSchema,
  deleteAccountSchema,
  type UpdateProfileInput,
  type DeleteAccountInput,
} from '@finance/shared';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import type { AccessTokenPayload } from '../auth/services/token.service.js';
import { UserService } from './user.service.js';

@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.users.me(user.sub);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.users.updateProfile(user.sub, body);
  }

  @Get('me/export')
  exportData(@CurrentUser() user: AccessTokenPayload) {
    return this.users.exportData(user.sub);
  }

  @Delete('me')
  deleteAccount(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
  ) {
    return this.users.deleteAccount(user.sub, body.password);
  }

  @Public()
  @RateLimit({ points: 30, windowSeconds: 60 })
  @Get('check-username')
  checkUsername(@Query('u') u: string) {
    return this.users.checkUsername(u ?? '');
  }
}
