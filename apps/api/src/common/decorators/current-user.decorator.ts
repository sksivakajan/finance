import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../modules/auth/services/token.service.js';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user: AccessTokenPayload }>();
    return req.user;
  },
);
