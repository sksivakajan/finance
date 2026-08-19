import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'friends-test';

describe('Friends (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let userA: { accessToken: string; username: string };
  let userB: { accessToken: string; username: string };
  let userC: { accessToken: string; username: string };

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
    userC = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-c`,
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

  it('rejects a friend request to yourself', async () => {
    const res = await auth(
      request(server()).post('/friends/requests'),
      userA.accessToken,
    )
      .send({ username: userA.username })
      .expect(400);
    expect(res.body.error.code).toBe('CANNOT_FRIEND_SELF');
  });

  it('sends, lists, and accepts a friend request end to end', async () => {
    await auth(request(server()).post('/friends/requests'), userA.accessToken)
      .send({ username: userB.username })
      .expect(201);

    const incoming = await auth(
      request(server()).get('/friends/requests?direction=incoming'),
      userB.accessToken,
    ).expect(200);
    expect(incoming.body.items).toHaveLength(1);
    const requestId = incoming.body.items[0].id as string;
    expect(incoming.body.items[0].user.username).toBe(userA.username);

    await auth(
      request(server()).post(`/friends/requests/${requestId}/accept`),
      userB.accessToken,
    ).expect(201);

    const friendsOfA = await auth(
      request(server()).get('/friends'),
      userA.accessToken,
    ).expect(200);
    expect(
      friendsOfA.body.items.map(
        (f: { user: { username: string } }) => f.user.username,
      ),
    ).toContain(userB.username);
    const friendsOfB = await auth(
      request(server()).get('/friends'),
      userB.accessToken,
    ).expect(200);
    expect(
      friendsOfB.body.items.map(
        (f: { user: { username: string } }) => f.user.username,
      ),
    ).toContain(userA.username);
  });

  it('does not let a stranger accept, reject, or cancel a request that is not theirs', async () => {
    await auth(request(server()).post('/friends/requests'), userA.accessToken)
      .send({ username: userC.username })
      .expect(201);
    const incoming = await auth(
      request(server()).get('/friends/requests?direction=incoming'),
      userC.accessToken,
    ).expect(200);
    const requestId = incoming.body.items[0].id as string;

    await auth(
      request(server()).post(`/friends/requests/${requestId}/accept`),
      userB.accessToken,
    ).expect(403);
    await auth(
      request(server()).post(`/friends/requests/${requestId}/cancel`),
      userB.accessToken,
    ).expect(403);

    await auth(
      request(server()).post(`/friends/requests/${requestId}/reject`),
      userC.accessToken,
    ).expect(201);
  });

  it('blocking cancels pending requests and prevents new ones both ways', async () => {
    await auth(request(server()).post('/friends/requests'), userC.accessToken)
      .send({ username: userA.username })
      .expect(201);

    const userCId = (
      await auth(
        request(server()).get('/friends/requests?direction=incoming'),
        userA.accessToken,
      ).expect(200)
    ).body.items[0].user.id as string;

    await auth(
      request(server()).post(`/friends/${userCId}/block`),
      userA.accessToken,
    ).expect(201);

    const stillIncoming = await auth(
      request(server()).get('/friends/requests?direction=incoming'),
      userA.accessToken,
    ).expect(200);
    expect(stillIncoming.body.items).toHaveLength(0);

    const res = await auth(
      request(server()).post('/friends/requests'),
      userC.accessToken,
    )
      .send({ username: userA.username })
      .expect(400);
    expect(res.body.error.code).toBe('REQUEST_NOT_ALLOWED');
  });
});
