import * as OTPAuth from 'otpauth';
import { EnvService } from '../../../config/env.service.js';
import { TwoFactorService } from './two-factor.service.js';

function extractBase32Secret(otpauthUri: string): string {
  const match = /secret=([A-Z2-7]+)/.exec(otpauthUri);
  if (!match) throw new Error('No secret found in otpauth URI');
  return match[1];
}

describe('TwoFactorService', () => {
  const service = new TwoFactorService(new EnvService());

  it('round-trips an enrollment: a code generated from the real secret verifies', async () => {
    const enrollment = await service.generateEnrollment('test@example.com');
    expect(enrollment.otpauthUri).toContain('otpauth://totp/');
    expect(enrollment.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const secret = OTPAuth.Secret.fromBase32(
      extractBase32Secret(enrollment.otpauthUri),
    );
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const validCode = totp.generate();

    expect(service.verifyCode(enrollment.secretEnc, validCode)).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const enrollment = await service.generateEnrollment('test@example.com');
    expect(service.verifyCode(enrollment.secretEnc, '000000')).toBe(false);
  });

  it('encrypts the secret at rest (never stores it in plaintext)', async () => {
    const enrollment = await service.generateEnrollment('test@example.com');
    const rawSecret = extractBase32Secret(enrollment.otpauthUri);
    expect(enrollment.secretEnc).not.toContain(rawSecret);
  });

  it('two enrollments for the same email produce different secrets', async () => {
    const a = await service.generateEnrollment('test@example.com');
    const b = await service.generateEnrollment('test@example.com');
    expect(a.secretEnc).not.toBe(b.secretEnc);
  });

  describe('recovery codes', () => {
    it('generates the configured count, all unique, formatted XXXXX-XXXXX', () => {
      const { plaintext, hashes } = service.generateRecoveryCodes();
      expect(plaintext).toHaveLength(10);
      expect(new Set(plaintext).size).toBe(10);
      expect(hashes).toHaveLength(10);
      for (const code of plaintext) {
        expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
      }
    });

    it('hashes deterministically regardless of case or dashes, so a user retyping it still matches', () => {
      const { plaintext, hashes } = service.generateRecoveryCodes();
      const code = plaintext[0];
      expect(service.hashRecoveryCode(code)).toBe(hashes[0]);
      expect(service.hashRecoveryCode(code.toLowerCase())).toBe(hashes[0]);
      expect(service.hashRecoveryCode(code.replace('-', ''))).toBe(hashes[0]);
    });
  });
});
