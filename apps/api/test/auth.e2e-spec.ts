import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'e2e-auth-test';
const uniqueEmail = (label: string) =>
  `${EMAIL_MARKER}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
const uniqueUsername = (label: string) =>
  `${label}${Date.now()}${Math.random().toString(36).slice(2, 6)}`.slice(0, 20);

function extractCookie(
  setCookieHeader: string[] | string | undefined,
  name: string,
): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  if (!found) throw new Error(`Cookie ${name} not found in response`);
  return found;
}

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('rejects duplicate registration', async () => {
    const email = uniqueEmail('dup');
    const payload = {
      email,
      password: 'correcthorsebattery',
      username: uniqueUsername('dup'),
      displayName: 'Dup',
    };
    await request(server()).post('/auth/register').send(payload).expect(201);
    const res = await request(server())
      .post('/auth/register')
      .send({ ...payload, username: uniqueUsername('dup2') })
      .expect(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('rejects a reserved username', async () => {
    const res = await request(server())
      .post('/auth/register')
      .send({
        email: uniqueEmail('reserved'),
        password: 'correcthorsebattery',
        username: 'admin',
        displayName: 'X',
      })
      .expect(400);
    expect(res.body.error.code).toBe('USERNAME_RESERVED');
  });

  it('rejects a password under 10 characters', async () => {
    const res = await request(server())
      .post('/auth/register')
      .send({
        email: uniqueEmail('weak'),
        password: 'short',
        username: uniqueUsername('weak'),
        displayName: 'X',
      })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  describe('full lifecycle: register -> blocked login -> verify -> login -> refresh -> logout', () => {
    const email = uniqueEmail('lifecycle');
    const password = 'correcthorsebattery';
    const username = uniqueUsername('lifecycle');
    let verificationToken: string;
    let accessToken: string;
    let refreshCookie: string;
    let rotatedCookie: string;

    it('registers and sends a verification email (spied, not parsed from logs)', async () => {
      const sendSpy = jest.spyOn(emailService, 'sendVerificationEmail');
      const res = await request(server())
        .post('/auth/register')
        .send({ email, password, username, displayName: 'Lifecycle' })
        .expect(201);
      expect(res.body.message).toMatch(/check your email/i);
      const call = sendSpy.mock.calls.find((c) => c[0] === email);
      expect(call).toBeDefined();
      verificationToken = call![1];
      expect(verificationToken).toEqual(expect.any(String));
    });

    it('blocks login before verification', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email, password })
        .expect(403);
      expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('verifies the email', async () => {
      const res = await request(server())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(201);
      expect(res.body.message).toMatch(/verified/i);
    });

    it('rejects reusing the same verification token', async () => {
      const res = await request(server())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('logs in and receives an access token + refresh cookie', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      accessToken = res.body.accessToken;
      expect(accessToken).toEqual(expect.any(String));
      refreshCookie = extractCookie(res.headers['set-cookie'], 'refresh_token');
    });

    it('rejects protected routes with no token', async () => {
      const res = await request(server()).get('/users/me').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('accepts the access token on a protected route', async () => {
      const res = await request(server())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.email).toBe(email);
      expect(res.body.profile.defaultCurrency).toBe('LKR');
    });

    it('rotates the refresh token on /auth/refresh', async () => {
      const res = await request(server())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(201);
      expect(res.body.accessToken).toEqual(expect.any(String));
      rotatedCookie = extractCookie(res.headers['set-cookie'], 'refresh_token');
      expect(rotatedCookie).not.toBe(refreshCookie);
    });

    it('detects reuse of the stale pre-rotation refresh token and kills the session', async () => {
      const res = await request(server())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
      expect(res.body.error.code).toBe('SESSION_REUSE_DETECTED');
    });

    it('rejects the rotated cookie too, since reuse detection killed the whole session', async () => {
      await request(server())
        .post('/auth/refresh')
        .set('Cookie', rotatedCookie)
        .expect(401);
    });
  });

  describe('forgot / reset password', () => {
    const email = uniqueEmail('reset');
    const oldPassword = 'correcthorsebattery';
    const newPassword = 'differenthorsebattery';
    const username = uniqueUsername('reset');

    beforeAll(async () => {
      const sendSpy = jest.spyOn(emailService, 'sendVerificationEmail');
      await request(server())
        .post('/auth/register')
        .send({ email, password: oldPassword, username, displayName: 'Reset' })
        .expect(201);
      const token = sendSpy.mock.calls.find((c) => c[0] === email)![1];
      await request(server())
        .post('/auth/verify-email')
        .send({ token })
        .expect(201);
    });

    it('never reveals whether the account exists', async () => {
      const res = await request(server())
        .post('/auth/forgot-password')
        .send({ email: uniqueEmail('nonexistent') })
        .expect(201);
      expect(res.body.message).toMatch(/if that account exists/i);
    });

    it('resets the password and invalidates the old one', async () => {
      const sendSpy = jest.spyOn(emailService, 'sendPasswordResetEmail');
      await request(server())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(201);
      const resetToken = sendSpy.mock.calls.find((c) => c[0] === email)![1];

      await request(server())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword })
        .expect(201);

      await request(server())
        .post('/auth/login')
        .send({ email, password: oldPassword })
        .expect(401);
      await request(server())
        .post('/auth/login')
        .send({ email, password: newPassword })
        .expect(201);
    });
  });

  describe('two-factor authentication', () => {
    const email = uniqueEmail('2fa');
    const password = 'correcthorsebattery';
    const username = uniqueUsername('2fa');
    let accessToken: string;

    beforeAll(async () => {
      const sendSpy = jest.spyOn(emailService, 'sendVerificationEmail');
      await request(server())
        .post('/auth/register')
        .send({ email, password, username, displayName: '2FA' })
        .expect(201);
      const token = sendSpy.mock.calls.find((c) => c[0] === email)![1];
      await request(server())
        .post('/auth/verify-email')
        .send({ token })
        .expect(201);
      const login = await request(server())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      accessToken = login.body.accessToken;
    });

    function generateCode(otpauthUri: string): string {
      const secret = OTPAuth.Secret.fromBase32(
        /secret=([A-Z2-7]+)/.exec(otpauthUri)![1],
      );
      return new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
      }).generate();
    }

    it('enrolls, confirms with a real TOTP code, and issues recovery codes', async () => {
      const enable = await request(server())
        .post('/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      expect(enable.body.otpauthUri).toContain('otpauth://totp/');

      const confirm = await request(server())
        .post('/auth/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: generateCode(enable.body.otpauthUri) })
        .expect(201);
      expect(confirm.body.recoveryCodes).toHaveLength(10);
    });

    it('requires a 2FA code on subsequent logins', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email, password })
        .expect(401);
      expect(res.body.error.code).toBe('TWO_FACTOR_REQUIRED');
    });

    it('rejects login with an invalid 2FA code', async () => {
      const res = await request(server())
        .post('/auth/login')
        .send({ email, password, twoFactorCode: '000000' })
        .expect(401);
      expect(res.body.error.code).toBe('INVALID_TWO_FACTOR_CODE');
    });
  });
});
