import { beforeEach, describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../src/lib/crypto.js';

const TEST_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=';

describe('crypto helpers', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it('round trips plaintext with AES-256-GCM', () => {
    const plaintext = 'sensitive-data';
    const cipher = encrypt(plaintext);
    expect(typeof cipher).toBe('string');
    const result = decrypt(cipher);
    expect(result).toBe(plaintext);
  });

  it('throws on malformed ciphertext', () => {
    expect(() => decrypt('invalid')).toThrow();
  });
});
