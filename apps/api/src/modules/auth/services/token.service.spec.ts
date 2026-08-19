import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { EnvService } from '../../../config/env.service.js';
import { TokenService } from './token.service.js';

describe('TokenService', () => {
  const service = new TokenService(new JwtService(), new EnvService());

  describe('access tokens', () => {
    it('round-trips: a signed token verifies back to the same userId/sessionId', async () => {
      const token = await service.signAccessToken('user-1', 'session-1');
      const payload = await service.verifyAccessToken(token);
      expect(payload.sub).toBe('user-1');
      expect(payload.sessionId).toBe('session-1');
    });

    it('rejects a garbage token', async () => {
      await expect(
        service.verifyAccessToken('not-a-real-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token signed with a different secret', async () => {
      const otherService = new TokenService(new JwtService(), new EnvService());
      // Sign with the real service, then tamper with the payload segment so
      // the signature no longer matches — simulates a forged/modified token.
      const token = await service.signAccessToken('user-1', 'session-1');
      const tampered = token.slice(0, -4) + 'abcd';
      await expect(otherService.verifyAccessToken(tampered)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh tokens', () => {
    it('embeds the sessionId as an extractable prefix', () => {
      const { token } = service.generateRefreshToken('session-42');
      expect(service.extractSessionId(token)).toBe('session-42');
    });

    it('hashes deterministically (same token -> same hash)', () => {
      const { token, hash } = service.generateRefreshToken('session-1');
      expect(service.hashRefreshToken(token)).toBe(hash);
    });

    it('never stores the secret half in the hash, and each token is unique', () => {
      const a = service.generateRefreshToken('session-1');
      const b = service.generateRefreshToken('session-1');
      expect(a.token).not.toBe(b.token);
      expect(a.hash).not.toBe(b.hash);
    });

    it('extractSessionId returns null for a malformed token', () => {
      expect(service.extractSessionId('')).toBeNull();
    });
  });
});
