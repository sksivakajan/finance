import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('verifies a correct password against its hash', async () => {
    const hash = await service.hash('correcthorsebattery');
    await expect(service.verify(hash, 'correcthorsebattery')).resolves.toBe(
      true,
    );
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('correcthorsebattery');
    await expect(service.verify(hash, 'wrongpassword')).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const [a, b] = await Promise.all([
      service.hash('correcthorsebattery'),
      service.hash('correcthorsebattery'),
    ]);
    expect(a).not.toBe(b);
  });

  it('never stores the plaintext password in the hash', async () => {
    const hash = await service.hash('correcthorsebattery');
    expect(hash).not.toContain('correcthorsebattery');
  });
});
