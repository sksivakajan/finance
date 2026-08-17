import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { VerificationTokenPurpose } from '../../../generated/prisma/enums.js';

const TOKEN_TTL_MS: Record<VerificationTokenPurpose, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

@Injectable()
export class VerificationTokenService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(
    userId: string,
    purpose: VerificationTokenPurpose,
  ): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: {
        userId,
        purpose,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
      },
    });
    return token;
  }

  /** Verifies and atomically consumes a token. Returns the userId on success, null otherwise. */
  async consume(
    token: string,
    purpose: VerificationTokenPurpose,
  ): Promise<string | null> {
    const tokenHash = this.hash(token);
    const record = await this.prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) return null;

    // Guard against a rare double-consume race (two requests with the same
    // token arriving concurrently): only the request that flips usedAt wins.
    const { count } = await this.prisma.verificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) return null;

    return record.userId;
  }
}
