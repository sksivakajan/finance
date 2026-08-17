import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { EnvService } from '../../../config/env.service.js';

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity

@Injectable()
export class TwoFactorService {
  constructor(private readonly env: EnvService) {}

  private encryptionKey(): Buffer {
    return Buffer.from(this.env.values.TWO_FACTOR_ENCRYPTION_KEY, 'hex');
  }

  /** AES-256-GCM, IV prepended, auth tag appended: iv(12) + ciphertext + tag(16), base64. */
  private encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(plain, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, ciphertext, tag]).toString('base64');
  }

  private decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const ciphertext = buf.subarray(12, buf.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Generates a new TOTP secret + otpauth URI + a QR code data URL for enrollment. */
  async generateEnrollment(
    email: string,
  ): Promise<{ secretEnc: string; otpauthUri: string; qrCodeDataUrl: string }> {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'Finance App',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const otpauthUri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
    return {
      secretEnc: this.encrypt(secret.base32),
      otpauthUri,
      qrCodeDataUrl,
    };
  }

  verifyCode(secretEnc: string, code: string): boolean {
    const secret = OTPAuth.Secret.fromBase32(this.decrypt(secretEnc));
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    // window: 1 tolerates ±30s clock drift between server and authenticator app.
    return totp.validate({ token: code, window: 1 }) !== null;
  }

  generateRecoveryCodes(): { plaintext: string[]; hashes: string[] } {
    const plaintext = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      this.randomRecoveryCode(),
    );
    const hashes = plaintext.map((code) => this.hashRecoveryCode(code));
    return { plaintext, hashes };
  }

  hashRecoveryCode(code: string): string {
    return createHash('sha256')
      .update(code.toUpperCase().replace(/-/g, ''))
      .digest('hex');
  }

  private randomRecoveryCode(): string {
    const bytes = randomBytes(10);
    let raw = '';
    for (const byte of bytes) {
      raw += RECOVERY_CODE_ALPHABET[byte % RECOVERY_CODE_ALPHABET.length];
    }
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  }
}
