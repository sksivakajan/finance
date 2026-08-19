import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

// Per docs/BLUEPRINT.md §2/§13/§28: a personal finance object is visible
// only to its owner. These tests prove that server-side, independent of
// whatever the frontend does or doesn't render — the actual security
// boundary the spec insists on.
const EMAIL_MARKER = 'authz-test';

describe('Cross-user authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let userA: { accessToken: string };
  let userB: { accessToken: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);
    userA = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-a`,
    );
    userB = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-b`,
    );
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  const server = () => app.getHttpServer();
  function auth(req: request.Test, token: string) {
    return req.set('Authorization', `Bearer ${token}`);
  }

  describe('income', () => {
    let incomeId: string;

    beforeAll(async () => {
      const res = await auth(
        request(server()).post('/income'),
        userA.accessToken,
      )
        .send({
          amountMinor: '100000',
          currency: 'LKR',
          source: 'Job',
          date: '2026-08-01T00:00:00.000Z',
        })
        .expect(201);
      incomeId = res.body.id;
    });

    it('owner can read their own income', async () => {
      await auth(
        request(server()).get(`/income/${incomeId}`),
        userA.accessToken,
      ).expect(200);
    });

    it('another user cannot read it', async () => {
      const res = await auth(
        request(server()).get(`/income/${incomeId}`),
        userB.accessToken,
      ).expect(400);
      expect(res.body.error.code).toBe('INCOME_NOT_FOUND');
    });

    it('another user cannot update it', async () => {
      await auth(
        request(server()).patch(`/income/${incomeId}`),
        userB.accessToken,
      )
        .send({ source: 'Hacked' })
        .expect(400);
    });

    it('another user cannot delete it', async () => {
      await auth(
        request(server()).delete(`/income/${incomeId}`),
        userB.accessToken,
      ).expect(400);
    });

    it("a user's income list never contains another user's rows", async () => {
      const res = await auth(
        request(server()).get('/income'),
        userB.accessToken,
      ).expect(200);
      const ids = res.body.items.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(incomeId);
    });
  });

  describe('expenses', () => {
    let expenseId: string;

    beforeAll(async () => {
      const res = await auth(
        request(server()).post('/expenses'),
        userA.accessToken,
      )
        .send({
          amountMinor: '50000',
          currency: 'LKR',
          merchant: 'Cafe',
          date: '2026-08-01T00:00:00.000Z',
        })
        .expect(201);
      expenseId = res.body.id;
    });

    it('another user cannot read, update, or delete', async () => {
      // GET goes through assertReadable (owner/participant/group-member),
      // which 404s rather than 400s -- it's answering "is this visible to
      // you at all", not "do you own this row" the way write ops do.
      await auth(
        request(server()).get(`/expenses/${expenseId}`),
        userB.accessToken,
      ).expect(404);
      await auth(
        request(server()).patch(`/expenses/${expenseId}`),
        userB.accessToken,
      )
        .send({ merchant: 'Hacked' })
        .expect(400);
      await auth(
        request(server()).delete(`/expenses/${expenseId}`),
        userB.accessToken,
      ).expect(400);
    });
  });

  describe('categories', () => {
    let categoryId: string;

    beforeAll(async () => {
      const res = await auth(
        request(server()).post('/categories'),
        userA.accessToken,
      )
        .send({ name: 'Private Category', kind: 'EXPENSE' })
        .expect(201);
      categoryId = res.body.id;
    });

    it("another user's category list never contains it", async () => {
      const res = await auth(
        request(server()).get('/categories'),
        userB.accessToken,
      ).expect(200);
      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).not.toContain('Private Category');
    });

    it('another user cannot archive it', async () => {
      const res = await auth(
        request(server()).delete(`/categories/${categoryId}`),
        userB.accessToken,
      ).expect(400);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('sessions', () => {
    it("a user cannot revoke another user's session", async () => {
      const sessions = await auth(
        request(server()).get('/auth/sessions'),
        userA.accessToken,
      ).expect(200);
      const sessionId = sessions.body[0].id as string;
      const res = await auth(
        request(server()).delete(`/auth/sessions/${sessionId}`),
        userB.accessToken,
      ).expect(400);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });
});
