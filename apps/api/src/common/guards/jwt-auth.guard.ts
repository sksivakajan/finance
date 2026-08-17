import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenService } from '../../modules/auth/services/token.service.js';

// Registered globally (see AuthModule) so every route is authenticated by
// default; routes opt out explicitly with @Public(). This is deliberately
// deny-by-default per docs/BLUEPRINT.md §29 ("never trust frontend permissions")
// so a new controller can't accidentally ship without auth.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please log in to continue.',
      });
    }

    const token = header.slice('Bearer '.length);
    const payload = await this.tokens.verifyAccessToken(token);
    (req as Request & { user: typeof payload }).user = payload;
    return true;
  }
}
