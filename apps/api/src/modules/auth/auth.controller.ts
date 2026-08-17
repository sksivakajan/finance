import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  twoFactorVerifySchema,
  twoFactorDisableSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
  type VerifyEmailInput,
  type ResendVerificationInput,
  type TwoFactorVerifyInput,
  type TwoFactorDisableInput,
} from '@finance/shared';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EnvService } from '../../config/env.service.js';
import { AuthService } from './auth.service.js';
import type { AccessTokenPayload } from './services/token.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.env.values.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.env.values.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private requestMeta(req: Request) {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  @Public()
  @RateLimit({ points: 5, windowSeconds: 60 })
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput) {
    return this.auth.register(body);
  }

  @Public()
  @RateLimit({ points: 5, windowSeconds: 60 })
  @Post('verify-email')
  verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
  ) {
    return this.auth.verifyEmail(body.token);
  }

  @Public()
  @RateLimit({ points: 3, windowSeconds: 60 })
  @Post('resend-verification')
  resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema))
    body: ResendVerificationInput,
  ) {
    return this.auth.resendVerification(body.email);
  }

  @Public()
  @RateLimit({ points: 10, windowSeconds: 60 })
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.auth.login(
      body,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (
      req.cookies as Record<string, string | undefined> | undefined
    )?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Please log in again.',
      });
    }
    const { accessToken, refreshToken } = await this.auth.refresh(
      token,
      this.requestMeta(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (
      req.cookies as Record<string, string | undefined> | undefined
    )?.[REFRESH_COOKIE];
    const sessionId = token ? this.extractSessionIdSafe(token) : null;
    if (sessionId) await this.auth.logout(sessionId);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { message: 'Logged out.' };
  }

  private extractSessionIdSafe(token: string): string | null {
    const [sessionId] = token.split('.');
    return sessionId || null;
  }

  @Public()
  @RateLimit({ points: 5, windowSeconds: 60 })
  @Post('forgot-password')
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: ForgotPasswordInput,
  ) {
    return this.auth.forgotPassword(body.email);
  }

  @Public()
  @RateLimit({ points: 5, windowSeconds: 60 })
  @Post('reset-password')
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ) {
    return this.auth.resetPassword(body.token, body.newPassword);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
  ) {
    return this.auth.changePassword(
      user.sub,
      user.sessionId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.listSessions(user.sub, user.sessionId);
  }

  @Delete('sessions/:id')
  revokeSession(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
  ) {
    return this.auth.revokeSession(user.sub, id);
  }

  @Post('2fa/enable')
  async enableTwoFactor(@CurrentUser() user: AccessTokenPayload) {
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
    });
    return this.auth.enableTwoFactor(user.sub, account.email);
  }

  @Post('2fa/verify')
  confirmTwoFactor(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(twoFactorVerifySchema))
    body: TwoFactorVerifyInput,
  ) {
    return this.auth.confirmTwoFactor(user.sub, body.code);
  }

  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(twoFactorDisableSchema))
    body: TwoFactorDisableInput,
  ) {
    return this.auth.disableTwoFactor(user.sub, body.password, body.code);
  }
}
