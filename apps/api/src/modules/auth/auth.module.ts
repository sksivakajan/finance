import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';
import { TwoFactorService } from './services/two-factor.service.js';
import { EmailService } from './services/email.service.js';
import { VerificationTokenService } from './services/verification-token.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    TwoFactorService,
    EmailService,
    VerificationTokenService,
    // Global guards: every route requires a valid access token by default
    // (opt out with @Public()), and rate limiting is enforced wherever
    // @RateLimit() is applied. See docs/BLUEPRINT.md §29.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
