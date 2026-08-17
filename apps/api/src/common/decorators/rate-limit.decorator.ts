import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Max requests allowed within `windowSeconds`. */
  points: number;
  windowSeconds: number;
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
