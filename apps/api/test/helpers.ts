import request from 'supertest';
import type { App } from 'supertest/types';
import type { EmailService } from '../src/modules/auth/services/email.service.js';

export const uniqueEmail = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

// usernameSchema only allows [a-zA-Z0-9_], max 20 chars. Build the uniquifying
// suffix first and always keep it whole, then fit as much of the (sanitized)
// label as remains — truncating from the end like a plain slice(0, 20) would
// silently cut off the random suffix for longer labels, and since Date.now()'s
// high-order digits barely change hour to hour, two runs on the same day could
// truncate down to the exact same username (this bit real Phase 2 e2e specs).
export const uniqueUsername = (label: string): string => {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const clean = label.replace(/[^a-zA-Z0-9_]/g, '');
  const maxLabelLen = Math.max(1, 20 - suffix.length);
  return `${clean.slice(0, maxLabelLen)}${suffix}`;
};

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
