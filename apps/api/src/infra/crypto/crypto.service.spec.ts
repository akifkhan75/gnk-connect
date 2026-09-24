import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    // Set a predictable key for testing
    process.env.PII_ENCRYPTION_KEY =
      'v1:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    delete process.env.PII_ENCRYPTION_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt and decrypt a string successfully', () => {
    const plainText = 'PK123456789';
    const cipherText = service.encrypt(plainText);

    expect(cipherText).toBeDefined();
    expect(cipherText).not.toEqual(plainText);
    expect(cipherText.startsWith('v1:')).toBeTruthy();

    const decrypted = service.decrypt(cipherText);
    expect(decrypted).toEqual(plainText);
  });

  it('should format output as version:iv:authTag:encrypted', () => {
    const cipherText = service.encrypt('test data');
    const parts = cipherText.split(':');

    expect(parts).toHaveLength(4);
    expect(parts[0]).toEqual('v1');
    // base64 strings don't contain colons, so length should exactly be 4
  });

  it('should throw an error when decrypting invalid format', () => {
    expect(() => service.decrypt('invalid-format')).toThrow('Invalid cipherText format');
  });

  it('should throw an error when key version is missing', () => {
    expect(() => service.decrypt('v99:iv:tag:data')).toThrow(
      'Encryption key version v99 not found',
    );
  });
});
