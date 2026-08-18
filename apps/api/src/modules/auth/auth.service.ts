import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RegisterInput, LoginInput } from '@finance/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EnvService } from '../../config/env.service.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';
import { TwoFactorService } from './services/two-factor.service.js';
import { EmailService } from './services/email.service.js';
import { VerificationTokenService } from './services/verification-token.service.js';
import { RESERVED_USERNAMES } from '../../common/reserved-usernames.js';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../finance/category/default-categories.js';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly twoFactor: TwoFactorService,
    private readonly email: EmailService,
    private readonly verificationTokens: VerificationTokenService,
  ) {}

  async register(input: RegisterInput) {
    const usernameLower = input.username.toLowerCase();
    if (RESERVED_USERNAMES.has(usernameLower)) {
      throw new BadRequestException({
        code: 'USERNAME_RESERVED',
        message: "That username isn't available.",
      });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: usernameLower }] },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ACCOUNT_EXISTS',
        message: 'An account with that email or username already exists.',
      });
    }

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        username: usernameLower,
        usernameDisplay: input.username,
        profile: {
          create: {
            displayName: input.displayName,
            defaultCurrency: this.env.values.DEFAULT_CURRENCY,
          },
        },
        categories: {
          create: [
            ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
              ...c,
              kind: 'EXPENSE' as const,
              isSystemDefault: true,
            })),
            ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
              ...c,
              kind: 'INCOME' as const,
              isSystemDefault: true,
            })),
          ],
        },
      },
    });

    const token = await this.verificationTokens.create(user.id, 'EMAIL_VERIFY');
    await this.email.sendVerificationEmail(user.email, token);

    return {
      message:
        'Account created. Please check your email to verify your account before logging in.',
    };
  }

  async verifyEmail(token: string) {
    const userId = await this.verificationTokens.consume(token, 'EMAIL_VERIFY');
    if (!userId) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'That verification link is invalid or has expired.',
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
    return { message: 'Email verified. You can now log in.' };
  }

  async resendVerification(emailAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailAddress },
    });
    if (user && !user.emailVerified) {
      const token = await this.verificationTokens.create(
        user.id,
        'EMAIL_VERIFY',
      );
      await this.email.sendVerificationEmail(user.email, token);
    }
    // Same response whether or not the account exists, to avoid email enumeration.
    return {
      message:
        "If that account exists and isn't verified yet, we've sent a new verification email.",
    };
  }

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { twoFactor: true },
    });
    const passwordOk = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : false;
    if (!user || !passwordOk) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
      });
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'ACCOUNT_INACTIVE',
        message: 'This account is not active.',
      });
    }

    if (user.twoFactor?.enabled) {
      if (!input.twoFactorCode) {
        throw new UnauthorizedException({
          code: 'TWO_FACTOR_REQUIRED',
          message: 'Enter your two-factor authentication code.',
        });
      }
      await this.consumeTwoFactorCode(
        user.id,
        user.twoFactor,
        input.twoFactorCode,
      );
    }

    return this.issueSession(user.id, meta);
  }

  private async consumeTwoFactorCode(
    userId: string,
    twoFactor: { secretEnc: string; recoveryCodesHash: string[] },
    code: string,
  ) {
    if (this.twoFactor.verifyCode(twoFactor.secretEnc, code)) return;

    const codeHash = this.twoFactor.hashRecoveryCode(code);
    if (twoFactor.recoveryCodesHash.includes(codeHash)) {
      // Recovery codes are single-use: remove it once spent.
      await this.prisma.twoFactorSecret.update({
        where: { userId },
        data: {
          recoveryCodesHash: twoFactor.recoveryCodesHash.filter(
            (h) => h !== codeHash,
          ),
        },
      });
      return;
    }

    throw new UnauthorizedException({
      code: 'INVALID_TWO_FACTOR_CODE',
      message: 'Invalid two-factor code.',
    });
  }

  private async issueSession(userId: string, meta: RequestMeta) {
    const sessionId = randomUUID();
    const { token, hash } = this.tokens.generateRefreshToken(sessionId);
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: hash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: this.tokens.refreshTokenExpiryDate(),
      },
    });
    const accessToken = await this.tokens.signAccessToken(userId, sessionId);
    return { accessToken, refreshToken: token };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const sessionId = this.tokens.extractSessionId(refreshToken);
    if (!sessionId) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Please log in again.',
      });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Please log in again.',
      });
    }

    const providedHash = this.tokens.hashRefreshToken(refreshToken);
    if (providedHash !== session.refreshTokenHash) {
      // The token we were handed doesn't match what's on file for this session,
      // meaning it's a previously-rotated-out token being replayed: treat as a
      // possible compromise and kill the whole session rather than the request.
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'SESSION_REUSE_DETECTED',
        message: 'Please log in again.',
      });
    }

    const rotated = this.tokens.generateRefreshToken(sessionId);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: rotated.hash,
        lastUsedAt: new Date(),
        expiresAt: this.tokens.refreshTokenExpiryDate(),
        userAgent: meta.userAgent ?? session.userAgent,
        ipAddress: meta.ipAddress ?? session.ipAddress,
      },
    });
    const accessToken = await this.tokens.signAccessToken(
      session.userId,
      sessionId,
    );
    return { accessToken, refreshToken: rotated.token };
  }

  async logout(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new BadRequestException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found.',
      });
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.audit(userId, 'auth.session_revoked', 'Session', sessionId);
  }

  async forgotPassword(emailAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: emailAddress },
    });
    if (user) {
      const token = await this.verificationTokens.create(
        user.id,
        'PASSWORD_RESET',
      );
      await this.email.sendPasswordResetEmail(user.email, token);
    }
    return {
      message: "If that account exists, we've sent a password reset link.",
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.verificationTokens.consume(
      token,
      'PASSWORD_RESET',
    );
    if (!userId) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'That reset link is invalid or has expired.',
      });
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit(userId, 'auth.password_reset', 'User', userId);
    return { message: 'Your password has been reset. Please log in again.' };
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const ok = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect.',
      });
    }
    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await this.audit(userId, 'auth.password_changed', 'User', userId);
    return {
      message: 'Password changed. Your other sessions have been signed out.',
    };
  }

  async enableTwoFactor(userId: string, email: string) {
    const existing = await this.prisma.twoFactorSecret.findUnique({
      where: { userId },
    });
    if (existing?.enabled) {
      throw new ConflictException({
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled.',
      });
    }
    const enrollment = await this.twoFactor.generateEnrollment(email);
    await this.prisma.twoFactorSecret.upsert({
      where: { userId },
      create: {
        userId,
        secretEnc: enrollment.secretEnc,
        enabled: false,
        recoveryCodesHash: [],
      },
      update: {
        secretEnc: enrollment.secretEnc,
        enabled: false,
        recoveryCodesHash: [],
      },
    });
    return {
      otpauthUri: enrollment.otpauthUri,
      qrCodeDataUrl: enrollment.qrCodeDataUrl,
    };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const record = await this.prisma.twoFactorSecret.findUnique({
      where: { userId },
    });
    if (!record) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_NOT_STARTED',
        message: 'Start two-factor setup first.',
      });
    }
    if (record.enabled) {
      throw new ConflictException({
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: 'Two-factor authentication is already enabled.',
      });
    }
    if (!this.twoFactor.verifyCode(record.secretEnc, code)) {
      throw new UnauthorizedException({
        code: 'INVALID_TWO_FACTOR_CODE',
        message: 'Invalid code. Please try again.',
      });
    }
    const { plaintext, hashes } = this.twoFactor.generateRecoveryCodes();
    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { enabled: true, recoveryCodesHash: hashes },
    });
    await this.audit(userId, 'auth.2fa_enabled', 'User', userId);
    return { recoveryCodes: plaintext };
  }

  async disableTwoFactor(userId: string, password: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const ok = await this.passwords.verify(user.passwordHash, password);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect password.',
      });
    }
    const record = await this.prisma.twoFactorSecret.findUnique({
      where: { userId },
    });
    if (!record?.enabled) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: "Two-factor authentication isn't enabled.",
      });
    }
    await this.consumeTwoFactorCode(userId, record, code);
    await this.prisma.twoFactorSecret.delete({ where: { userId } });
    await this.audit(userId, 'auth.2fa_disabled', 'User', userId);
    return { message: 'Two-factor authentication has been disabled.' };
  }

  private async audit(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
  ) {
    await this.prisma.auditLog.create({
      data: { actorId, action, resourceType, resourceId },
    });
  }
}
