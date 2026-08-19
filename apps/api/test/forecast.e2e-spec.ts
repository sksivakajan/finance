import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'forecast-test';

describe('Forecast (e2e)', () => {
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

    await auth(request(server()).post('/income'), user.accessToken)
      .send({
        amountMinor: '100000',
        currency: 'LKR',
        source: 'Salary',
        date: new Date().toISOString(),
        isRecurring: true,
        recurrenceRule: 'MONTHLY',
      })
      .expect(201);

    await auth(request(server()).post('/scheduled-payments'), user.accessToken)
      .send({
        name: 'Rent',
        amountMinor: '30000',
        currency: 'LKR',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        recurrence: 'NONE',
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  it('projects a 30-day cash flow including the recurring income and the scheduled payment', async () => {
    const res = await auth(
      request(server()).get('/forecast?days=45'),
      user.accessToken,
    ).expect(200);
    expect(res.body.isEstimate).toBe(true);
    expect(res.body.horizonDays).toBe(45);
    const kinds = res.body.points.map((p: { kind: string }) => p.kind);
    expect(kinds).toContain('INCOME');
    expect(kinds).toContain('SCHEDULED_PAYMENT');
    // Ending balance should reflect the +1000 salary and -300 rent applied
    // on top of the starting balance (which is exactly 1000, since the
    // salary income itself already landed as a real Income row today).
    const startingBalance = BigInt(res.body.startingBalanceMinor);
    const endingBalance = BigInt(res.body.projectedEndingBalanceMinor);
    expect(endingBalance - startingBalance).toBe(100000n - 30000n);
  });

  it('caps the horizon at 365 days rather than accepting an unbounded range', async () => {
    const res = await auth(
      request(server()).get('/forecast?days=10000'),
      user.accessToken,
    ).expect(200);
    expect(res.body.horizonDays).toBe(365);
  });

  it("rejects a stranger's request for another user's loan payoff forecast", async () => {
    const loan = await auth(request(server()).post('/loans'), user.accessToken)
      .send({
        direction: 'I_OWE',
        counterpartyName: 'Bank',
        principalMinor: '120000',
        currency: 'LKR',
        startDate: new Date().toISOString(),
        schedule: {
          installmentMinor: '10000',
          frequency: 'MONTHLY',
          nextDueDate: new Date().toISOString(),
        },
      })
      .expect(201);

    const stranger = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-stranger`,
    );
    const res = await auth(
      request(server()).get(`/forecast/loans/${loan.body.id}`),
      stranger.accessToken,
    ).expect(400);
    expect(res.body.error.code).toBe('LOAN_NOT_FOUND');

    const own = await auth(
      request(server()).get(`/forecast/loans/${loan.body.id}`),
      user.accessToken,
    ).expect(200);
    expect(own.body.points.length).toBeGreaterThan(0);
    expect(own.body.points.at(-1).remainingMinor).toBe('0');
  });

  it("does not double-count a recurring income's own recorded date as a future occurrence too", async () => {
    // The Salary row from beforeAll is dated today and already counted in
    // startingBalanceMinor via the lifetime aggregate. A 1-day forecast
    // should NOT re-add it as a projected event just because "today" falls
    // inside the window -- only the *next* monthly occurrence is unrecorded.
    const res = await auth(
      request(server()).get('/forecast?days=1'),
      user.accessToken,
    ).expect(200);
    const salaryEvents = res.body.points.filter(
      (p: { label: string }) => p.label === 'Salary',
    );
    expect(salaryEvents).toHaveLength(0);
  });

  it('includes an item due "today" even later in the day, not just items strictly after this instant', async () => {
    // The web form always submits a date-only string (from <input
    // type="date">), which the frontend turns into midnight UTC today --
    // never the exact current instant. A forecast window whose lower bound
    // is "right now" would then read a midnight-today due date as already
    // in the past the moment any time has elapsed since midnight, and drop
    // it. Reproduce that exact shape here instead of a precise ISO timestamp.
    const todayMidnightUtc = new Date();
    todayMidnightUtc.setUTCHours(0, 0, 0, 0);

    await auth(request(server()).post('/scheduled-payments'), user.accessToken)
      .send({
        name: 'Due today',
        amountMinor: '5000',
        currency: 'LKR',
        dueDate: todayMidnightUtc.toISOString(),
        recurrence: 'NONE',
      })
      .expect(201);

    const res = await auth(
      request(server()).get('/forecast?days=1'),
      user.accessToken,
    ).expect(200);
    expect(
      res.body.points.some((p: { label: string }) => p.label === 'Due today'),
    ).toBe(true);
  });
});
