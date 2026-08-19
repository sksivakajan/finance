import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp } from './create-test-app.js';
import { cleanupTestUsers } from './cleanup.js';
import { registerVerifiedUser } from './helpers.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EmailService } from '../src/modules/auth/services/email.service.js';

const EMAIL_MARKER = 'chat-test';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailService: EmailService;
  let userA: { accessToken: string; username: string };
  let userB: { accessToken: string; username: string };
  let userStranger: { accessToken: string; username: string };
  let userBId: string;

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
    userStranger = await registerVerifiedUser(
      app.getHttpServer(),
      emailService,
      `${EMAIL_MARKER}-c`,
    );

    // Become friends via the real endpoints so this exercises the full path,
    // not a DB shortcut.
    await auth(
      request(app.getHttpServer()).post('/friends/requests'),
      userA.accessToken,
    )
      .send({ username: userB.username })
      .expect(201);
    const incoming = await auth(
      request(app.getHttpServer()).get('/friends/requests?direction=incoming'),
      userB.accessToken,
    ).expect(200);
    await auth(
      request(app.getHttpServer()).post(
        `/friends/requests/${incoming.body.items[0].id}/accept`,
      ),
      userB.accessToken,
    ).expect(201);
    const meB = await auth(
      request(app.getHttpServer()).get('/users/me'),
      userB.accessToken,
    ).expect(200);
    userBId = meB.body.id as string;
  });

  afterAll(async () => {
    await cleanupTestUsers(prisma, EMAIL_MARKER);
    await app.close();
  });

  const server = () => app.getHttpServer();
  function auth(req: request.Test, token: string) {
    return req.set('Authorization', `Bearer ${token}`);
  }

  it('refuses to start a conversation with a non-friend', async () => {
    const stranger = await auth(
      request(server()).get('/users/me'),
      userStranger.accessToken,
    ).expect(200);
    const res = await auth(
      request(server()).post('/conversations'),
      userA.accessToken,
    )
      .send({ friendUserId: stranger.body.id })
      .expect(400);
    expect(res.body.error.code).toBe('NOT_FRIENDS');
  });

  it('creates a direct conversation between friends, is idempotent, and carries messages', async () => {
    const first = await auth(
      request(server()).post('/conversations'),
      userA.accessToken,
    )
      .send({ friendUserId: userBId })
      .expect(201);
    const second = await auth(
      request(server()).post('/conversations'),
      userA.accessToken,
    )
      .send({ friendUserId: userBId })
      .expect(201);
    expect(second.body.id).toBe(first.body.id);
    const conversationId = first.body.id as string;

    await auth(
      request(server()).post(`/conversations/${conversationId}/messages`),
      userA.accessToken,
    )
      .send({ body: 'Hello there' })
      .expect(201);
    await auth(
      request(server()).post(`/conversations/${conversationId}/messages`),
      userB.accessToken,
    )
      .send({ body: 'Hi back' })
      .expect(201);

    const messages = await auth(
      request(server()).get(`/conversations/${conversationId}/messages`),
      userA.accessToken,
    ).expect(200);
    expect(messages.body.items.length).toBeGreaterThanOrEqual(2);

    // A stranger — not a member of this conversation — can't read it.
    await auth(
      request(server()).get(`/conversations/${conversationId}/messages`),
      userStranger.accessToken,
    ).expect(404);
  });

  it('only the author can edit or delete a message, and deletion clears the body', async () => {
    const conv = await auth(
      request(server()).post('/conversations'),
      userA.accessToken,
    )
      .send({ friendUserId: userBId })
      .expect(201);
    const msg = await auth(
      request(server()).post(`/conversations/${conv.body.id}/messages`),
      userA.accessToken,
    )
      .send({ body: 'original' })
      .expect(201);

    await auth(
      request(server()).patch(`/messages/${msg.body.id}`),
      userB.accessToken,
    )
      .send({ body: 'hijacked' })
      .expect(403);

    const edited = await auth(
      request(server()).patch(`/messages/${msg.body.id}`),
      userA.accessToken,
    )
      .send({ body: 'edited text' })
      .expect(200);
    expect(edited.body.body).toBe('edited text');
    expect(edited.body.editedAt).not.toBeNull();

    const deleted = await auth(
      request(server()).delete(`/messages/${msg.body.id}`),
      userA.accessToken,
    ).expect(200);
    expect(deleted.body.deleted).toBe(true);
    expect(deleted.body.body).toBeNull();
  });

  it('marking a conversation read clears its unread count', async () => {
    const conv = await auth(
      request(server()).post('/conversations'),
      userA.accessToken,
    )
      .send({ friendUserId: userBId })
      .expect(201);
    await auth(
      request(server()).post(`/conversations/${conv.body.id}/messages`),
      userA.accessToken,
    )
      .send({ body: 'ping' })
      .expect(201);

    const before = await auth(
      request(server()).get('/conversations'),
      userB.accessToken,
    ).expect(200);
    const beforeEntry = before.body.items.find(
      (c: { conversationId: string }) => c.conversationId === conv.body.id,
    );
    expect(beforeEntry.unreadCount).toBeGreaterThan(0);

    await auth(
      request(server()).post(`/conversations/${conv.body.id}/read`),
      userB.accessToken,
    ).expect(201);

    const after = await auth(
      request(server()).get('/conversations'),
      userB.accessToken,
    ).expect(200);
    const afterEntry = after.body.items.find(
      (c: { conversationId: string }) => c.conversationId === conv.body.id,
    );
    expect(afterEntry.unreadCount).toBe(0);
  });
});
