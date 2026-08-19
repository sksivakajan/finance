import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'shexp-test';

describe('Shared expenses, balances, money requests, settlements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let a: { accessToken: string; username: string; id: string };
  let b: { accessToken: string; username: string; id: string };
  let c: { accessToken: string; username: string; id: string };
  let stranger: { accessToken: string; username: string; id: string };

  const server = () => app.getHttpServer();
  function auth(req: request.Test, token: string) {
    return req.set('Authorization', `Bearer ${token}`);
  }
  async function becomeFriends(
    x: { accessToken: string; username: string },
    y: { accessToken: string; username: string },
  ) {
    await auth(request(server()).post('/friends/requests'), x.accessToken)
      .send({ username: y.username })
      .expect(201);
    const incoming = await auth(
      request(server()).get('/friends/requests?direction=incoming'),
      y.accessToken,
    ).expect(200);
    const req = incoming.body.items.find(
      (i: { user: { username: string } }) => i.user.username === x.username,
    );
    await auth(
      request(server()).post(`/friends/requests/${req.id}/accept`),
      y.accessToken,
    ).expect(201);
  }
  async function myId(token: string): Promise<string> {
    const res = await auth(request(server()).get('/users/me'), token).expect(
      200,
    );
    return res.body.id as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    emailService = app.get(EmailService);
    const rawA = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-a`,
    );
    const rawB = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-b`,
    );
    const rawC = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-c`,
    );
    const rawStranger = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-d`,
    );
    a = { ...rawA, id: await myId(rawA.accessToken) };
    b = { ...rawB, id: await myId(rawB.accessToken) };
    c = { ...rawC, id: await myId(rawC.accessToken) };
    stranger = { ...rawStranger, id: await myId(rawStranger.accessToken) };

    await becomeFriends(a, b);
    await becomeFriends(a, c);
    await becomeFriends(b, c);
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  describe('equal split', () => {
    let expenseId: string;

    it('rejects splitting with a non-friend', async () => {
      const res = await auth(request(server()).post('/expenses'), a.accessToken)
        .send({
          amountMinor: '300',
          currency: 'LKR',
          merchant: 'Dinner',
          date: '2026-08-01T00:00:00.000Z',
          splitMethod: 'EQUAL',
          participantIds: [a.id, stranger.id],
        })
        .expect(400);
      expect(res.body.error.code).toBe('NOT_FRIENDS');
    });

    it('creates an equal 3-way split and derives the correct balances', async () => {
      const res = await auth(request(server()).post('/expenses'), a.accessToken)
        .send({
          amountMinor: '300',
          currency: 'LKR',
          merchant: 'Dinner',
          date: '2026-08-01T00:00:00.000Z',
          splitMethod: 'EQUAL',
          participantIds: [a.id, b.id, c.id],
        })
        .expect(201);
      expenseId = res.body.id;

      const balanceAB = await auth(
        request(server()).get(`/balances/${b.id}`),
        a.accessToken,
      ).expect(200);
      expect(balanceAB.body).toEqual([{ currency: 'LKR', netMinor: '100' }]);
      const balanceAC = await auth(
        request(server()).get(`/balances/${c.id}`),
        a.accessToken,
      ).expect(200);
      expect(balanceAC.body).toEqual([{ currency: 'LKR', netMinor: '100' }]);
      // From B's side, A owes B nothing -- B owes A.
      const balanceBA = await auth(
        request(server()).get(`/balances/${a.id}`),
        b.accessToken,
      ).expect(200);
      expect(balanceBA.body).toEqual([{ currency: 'LKR', netMinor: '-100' }]);
    });

    it('lets a participant read the expense, but not a stranger', async () => {
      await auth(
        request(server()).get(`/expenses/${expenseId}`),
        b.accessToken,
      ).expect(200);
      await auth(
        request(server()).get(`/expenses/${expenseId}`),
        stranger.accessToken,
      ).expect(404);
    });

    it("shows up in the participant's shared-with-me list with their own share", async () => {
      const res = await auth(
        request(server()).get('/expenses/shared-with-me'),
        b.accessToken,
      ).expect(200);
      const row = res.body.items.find(
        (i: { id: string }) => i.id === expenseId,
      );
      expect(row.myShareMinor).toBe('100');
    });

    it("recording a settlement clears the payer's debt", async () => {
      await auth(request(server()).post('/settlements'), b.accessToken)
        .send({
          counterpartyId: a.id,
          direction: 'I_PAID',
          amountMinor: '100',
          currency: 'LKR',
        })
        .expect(201);
      const res = await auth(
        request(server()).get(`/balances/${b.id}`),
        a.accessToken,
      ).expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('percentage split', () => {
    it('rejects percentages that do not sum to 100%', async () => {
      const res = await auth(request(server()).post('/expenses'), a.accessToken)
        .send({
          amountMinor: '1000',
          currency: 'LKR',
          merchant: 'Groceries',
          date: '2026-08-02T00:00:00.000Z',
          splitMethod: 'PERCENTAGE',
          percentageShares: [
            { userId: a.id, percentageBps: 5000 },
            { userId: b.id, percentageBps: 4000 },
          ],
        })
        .expect(400);
      expect(res.body.error.code).toBe('EXPENSE_SPLIT_MISMATCH');
    });

    it('applies a valid percentage split', async () => {
      await auth(request(server()).post('/expenses'), a.accessToken)
        .send({
          amountMinor: '1000',
          currency: 'LKR',
          merchant: 'Groceries',
          date: '2026-08-02T00:00:00.000Z',
          splitMethod: 'PERCENTAGE',
          percentageShares: [
            { userId: a.id, percentageBps: 6000 },
            { userId: c.id, percentageBps: 4000 },
          ],
        })
        .expect(201);
      const res = await auth(
        request(server()).get(`/balances/${c.id}`),
        a.accessToken,
      ).expect(200);
      // c's earlier 100 (equal split) + 400 (percentage split) = 500 owed to a.
      expect(res.body).toEqual([{ currency: 'LKR', netMinor: '500' }]);
    });
  });

  describe('money requests', () => {
    it('a money request, once paid, records a settlement and clears the balance', async () => {
      const req = await auth(
        request(server()).post('/money-requests'),
        a.accessToken,
      )
        .send({
          receiverId: c.id,
          amountMinor: '500',
          currency: 'LKR',
          reason: 'Settling up',
        })
        .expect(201);

      // Only the receiver (c) can pay it.
      await auth(
        request(server()).post(`/money-requests/${req.body.id}/pay`),
        a.accessToken,
      ).expect(403);

      await auth(
        request(server()).post(`/money-requests/${req.body.id}/pay`),
        c.accessToken,
      ).expect(201);
      const res = await auth(
        request(server()).get(`/balances/${c.id}`),
        a.accessToken,
      ).expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('groups', () => {
    let groupId: string;

    it('rejects adding a non-friend to a group', async () => {
      const res = await auth(request(server()).post('/groups'), a.accessToken)
        .send({ name: 'Trip', memberUserIds: [b.id, stranger.id] })
        .expect(400);
      expect(res.body.error.code).toBe('NOT_FRIENDS');
    });

    it('creates a group and a group-scoped expense', async () => {
      const group = await auth(request(server()).post('/groups'), a.accessToken)
        .send({ name: 'Trip', memberUserIds: [b.id, c.id] })
        .expect(201);
      groupId = group.body.id;
      expect(group.body.members).toHaveLength(3);

      await auth(request(server()).post('/expenses'), a.accessToken)
        .send({
          amountMinor: '90',
          currency: 'LKR',
          merchant: 'Hotel',
          date: '2026-08-03T00:00:00.000Z',
          splitMethod: 'EQUAL',
          groupId,
          participantIds: [a.id, b.id, c.id],
        })
        .expect(201);

      const balances = await auth(
        request(server()).get(`/groups/${groupId}/balances`),
        b.accessToken,
      ).expect(200);
      const bRow = balances.body.items.find(
        (i: { user: { id: string } }) => i.user.id === b.id,
      );
      expect(bRow.balances).toEqual([{ currency: 'LKR', netMinor: '-30' }]);
    });

    it('a non-member cannot read the group', async () => {
      await auth(
        request(server()).get(`/groups/${groupId}`),
        stranger.accessToken,
      ).expect(404);
    });

    it("lists the group's expenses to members but not strangers", async () => {
      const res = await auth(
        request(server()).get(`/groups/${groupId}/expenses`),
        c.accessToken,
      ).expect(200);
      expect(
        res.body.items.some(
          (e: { merchant: string }) => e.merchant === 'Hotel',
        ),
      ).toBe(true);
      await auth(
        request(server()).get(`/groups/${groupId}/expenses`),
        stranger.accessToken,
      ).expect(404);
    });

    it('suggests debt-simplifying transfers for the group', async () => {
      const res = await auth(
        request(server()).get(`/balances/optimize?groupId=${groupId}`),
        a.accessToken,
      ).expect(200);
      expect(res.body.currency).toBe('LKR');
      const totalSuggested = res.body.transfers.reduce(
        (sum: number, t: { amountMinor: string }) =>
          sum + Number(t.amountMinor),
        0,
      );
      // b and c each owe 30 into the group pool (a fronted the 90).
      expect(totalSuggested).toBe(60);
    });
  });
});
