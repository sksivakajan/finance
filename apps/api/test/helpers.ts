import request from 'supertest';
import type { App } from 'supertest/types';
import type { EmailService } from '../src/modules/auth/services/email.service.js';

export const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

// usernameSchema only allows [a-zA-Z0-9_] — strip anything else out of the
// label (e.g. the hyphens in a test's EMAIL_MARKER) rather than let an
// otherwise-unrelated naming choice fail registration with VALIDATION_ERROR.
export const uniqueUsername = (label: string): string =>
  `${label.replace(/[^a-zA-Z0-9_]/g, '')}${Date.now()}${Math.random().toString(36).slice(2, 6)}`.slice(
    0,
    20,
  );

/** Registers, verifies (via a spy on EmailService rather than parsing logs),
 * and logs in. Returns the access token and user's email/id for e2e specs
 * that just need an authenticated user and don't care about the auth flow
 * itself. */
export async function registerVerifiedUser(
  server: App,
  emailService: EmailService,
  label: string,
  password = 'correcthorsebattery',
): Promise<{ email: string; username: string; accessToken: string }> {
  const email = uniqueEmail(label);
  const username = uniqueUsername(label);
  const sendSpy = jest.spyOn(emailService, 'sendVerificationEmail');
  await request(server)
    .post('/auth/register')
    .send({ email, password, username, displayName: label })
    .expect(201);
  const call = sendSpy.mock.calls.find((c) => c[0] === email);
  const token = call![1];
  await request(server).post('/auth/verify-email').send({ token }).expect(201);
  const login = await request(server)
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  return { email, username, accessToken: login.body.accessToken as string };
}
