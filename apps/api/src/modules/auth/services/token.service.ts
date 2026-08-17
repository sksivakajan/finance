import { randomBytes, createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EnvService } from '../../../config/env.service.js';

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
}

const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match)
    throw new Error(
      `Invalid duration "${value}" (expected e.g. "15m", "1h", "30d")`,
    );
  return Number(match[1]) * DURATION_UNIT_SECONDS[match[2]];
}

// Access tokens are short-lived signed JWTs (stateless). Refresh tokens are
// opaque random strings tied 1:1 to a Session row and only ever stored hashed
// (see docs/BLUEPRINT.md §8) — a stolen DB dump can't be replayed as a session.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly env: EnvService,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sessionId };
    return this.jwt.signAsync(payload, {
      secret: this.env.values.JWT_ACCESS_SECRET,
      expiresIn: parseDurationToSeconds(this.env.values.ACCESS_TOKEN_TTL),
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.env.values.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Your session has expired. Please log in again.',
      });
    }
  }

  /** New opaque refresh token for a given session: "<sessionId>.<secret>". */
  generateRefreshToken(sessionId: string): { token: string; hash: string } {
    const secret = randomBytes(32).toString('hex');
    const token = `${sessionId}.${secret}`;
    return { token, hash: this.hashRefreshToken(token) };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  extractSessionId(refreshToken: string): string | null {
    const [sessionId] = refreshToken.split('.');
    return sessionId || null;
  }

  refreshTokenExpiryDate(): Date {
    const days = this.env.values.REFRESH_TOKEN_TTL_DAYS;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
