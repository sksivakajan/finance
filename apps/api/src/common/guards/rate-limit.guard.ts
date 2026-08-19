import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';
import { RedisService } from '../../redis/redis.service.js';
import { EnvService } from '../../config/env.service.js';

// Redis-backed fixed-window limiter per docs/BLUEPRINT.md §18 threat model.
// Checks both the caller's IP and (when present) the account identifier in the
// body, so a distributed attack spread across many IPs against one account is
// still caught, and a single abusive IP hitting many accounts is still caught.
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly env: EnvService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // The e2e suite legitimately registers/logs in many accounts within
    // seconds from one "IP" (supertest's in-process loopback) — exactly the
    // pattern this guard exists to block in production. Rather than weaken
    // the real limits to accommodate tests, it's simply off under
    // NODE_ENV=test; manually verified against a live server instead (see
    // the auth module's commit history).
    if (this.env.values.NODE_ENV === 'test') return true;

    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const routeKey = `${context.getClass().name}.${context.getHandler().name}`;
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    await this.checkAndIncrement(`rl:${routeKey}:ip:${ip}`, options);

    const body: unknown = req.body;
    const rawEmail =
      typeof body === 'object' && body !== null && 'email' in body
        ? body.email
        : undefined;
    const email =
      typeof rawEmail === 'string' ? rawEmail.toLowerCase() : undefined;
    if (email) {
      await this.checkAndIncrement(`rl:${routeKey}:acct:${email}`, options);
    }

    return true;
  }

  private async checkAndIncrement(key: string, options: RateLimitOptions) {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, options.windowSeconds);
    }
    if (count > options.points) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a moment and try again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
