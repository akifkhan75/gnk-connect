import { CryptoService } from './crypto.service';

const KEY_V1 = 'v1:' + '0123456789abcdef'.repeat(4);
const KEY_V2 = 'v2:' + 'fedcba9876543210'.repeat(4);

const make = (keys: string) => new CryptoService(keys);

describe('CryptoService', () => {
  it('round-trips plaintext', () => {
    const crypto = make(KEY_V1);
    const cipher = crypto.encrypt('AB1234567');
    expect(cipher).not.toContain('AB1234567');
    expect(cipher.startsWith('v1:')).toBe(true);
    expect(crypto.decrypt(cipher)).toBe('AB1234567');
  });

  it('uses a fresh IV for every encryption', () => {
    const crypto = make(KEY_V1);
    expect(crypto.encrypt('same')).not.toBe(crypto.encrypt('same'));
  });

  it('decrypts values written with an older key after rotation', () => {
    const old = make(KEY_V1).encrypt('35201-1234567-1');
    const rotated = make(`${KEY_V2},${KEY_V1}`);
    expect(rotated.decrypt(old)).toBe('35201-1234567-1');
    expect(rotated.encrypt('x').startsWith('v2:')).toBe(true);
  });

  it('rejects tampered ciphertext', () => {
    const crypto = make(KEY_V1);
    const [v, iv, tag, data] = crypto.encrypt('secret').split(':');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 0xff;
    expect(() => crypto.decrypt([v, iv, tag, flipped.toString('base64')].join(':'))).toThrow();
  });

  it('hashes tokens deterministically', () => {
    const { token, hash } = CryptoService.newToken();
    expect(CryptoService.hash(token)).toBe(hash);
    expect(hash).toHaveLength(64);
  });
});
