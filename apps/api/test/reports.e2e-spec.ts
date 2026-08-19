import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'reports-test';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let user: { accessToken: string };

  const server = () => app.getHttpServer();
  function auth(req: request.Test, token: string) {
    return req.set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);
    user = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      EMAIL_MARKER,
    );
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(server()).get('/reports/balance-history').expect(401);
  });

  it("carries a prior balance into the window and applies each day's activity as a running total", async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);

    // Lands before the 3-day window below, so it should only ever show up
    // folded into the window's starting balance, never as its own point.
    await auth(request(server()).post('/income'), user.accessToken)
      .send({
        amountMinor: '100000',
        currency: 'LKR',
        source: 'Old salary',
        date: fiveDaysAgo.toISOString(),
      })
      .expect(201);

    await auth(request(server()).post('/expenses'), user.accessToken)
      .send({
        amountMinor: '20000',
        currency: 'LKR',
        merchant: 'Groceries',
        date: today.toISOString(),
      })
      .expect(201);

    const res = await auth(
      request(server()).get('/reports/balance-history?days=3'),
      user.accessToken,
    ).expect(200);

    expect(res.body).toHaveLength(3);
    const [first, , last] = res.body;
    // The prior income (+100000) is already folded into day one's balance,
    // and does not reappear as that day's incomeMinor.
    expect(first.incomeMinor).toBe('0');
    expect(BigInt(last.balanceMinor) - BigInt(first.balanceMinor)).toBe(
      -20000n,
    );
    expect(last.expensesMinor).toBe('20000');
    expect(last.date).toBe(today.toISOString().slice(0, 10));
  });

  it('caps the window at 180 days rather than accepting an unbounded range', async () => {
    const res = await auth(
      request(server()).get('/reports/balance-history?days=10000'),
      user.accessToken,
    ).expect(200);
    expect(res.body).toHaveLength(180);
  });

  it('computes lifetime total, this/last month, and a monthly average for a fresh user', async () => {
    const summaryUser = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-summary`,
    );
    const now = new Date();
    const midThisMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15),
    );

    await auth(request(server()).post('/income'), summaryUser.accessToken)
      .send({
        amountMinor: '100000',
        currency: 'LKR',
        source: 'Salary',
        date: midThisMonth.toISOString(),
      })
      .expect(201);

    const res = await auth(
      request(server()).get('/reports/income-summary'),
      summaryUser.accessToken,
    ).expect(200);
    expect(res.body.totalMinor).toBe('100000');
    expect(res.body.thisMonthMinor).toBe('100000');
    expect(res.body.lastMonthMinor).toBe('0');
    // Only one calendar month (this one) has any income recorded yet.
    expect(res.body.avgMonthlyMinor).toBe('100000');
  });
});
