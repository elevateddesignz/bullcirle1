import { describe, expect, it } from 'vitest';
import { encrypt, decrypt } from '../lib/crypto.js';

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

describe('crypto', () => {
  it('round-trips plaintext using AES-256-GCM', async () => {
    const plaintext = 'sensitive-data';
    const cipher = await encrypt(plaintext);
    expect(cipher).toBeTypeOf('string');
    const roundTrip = await decrypt(cipher);
    expect(roundTrip).toBe(plaintext);
  });

  it('throws on invalid payload', async () => {
    await expect(decrypt('invalid')).rejects.toThrow();
  });
});
