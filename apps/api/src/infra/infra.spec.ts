import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AuditService } from '../modules/audit/audit.service';
import { MailerService } from './mailer/mailer.service';
import { StorageService } from './storage/storage.service';
import { mockPrisma } from '../test/helpers';

const config = (values: Record<string, unknown>) =>
  ({
    get: (key: string) => values[key],
  }) as unknown as ConfigService;

describe('MailerService', () => {
  const mailer = new MailerService(
    config({ PORTAL_URL: 'http://portal.test/', ADMIN_URL: 'http://admin.test/' }) as never,
  );

  it('builds portal and admin URLs without trailing slashes', () => {
    expect(mailer.portalUrl('/login')).toBe('http://portal.test/login');
    expect(mailer.adminUrl('/login')).toBe('http://admin.test/login');
  });

  it('renders every template', async () => {
    const log = jest.spyOn((mailer as any).logger, 'log').mockImplementation();
    await mailer.verifyEmail('a@b.c', 'Ali', 'tok');
    await mailer.registrationAttempt('a@b.c');
    await mailer.passwordReset('a@b.c', 'PARTNER', 'tok');
    await mailer.passwordReset('a@b.c', 'STAFF', 'tok');
    await mailer.accountLocked('a@b.c', 15);
    await mailer.partnerInvite('a@b.c', 'Al Noor', 'Sara', 'tok');
    await mailer.staffInvite('a@b.c', 'Sara', 'tok');
    await mailer.accountCreated('a@b.c', 'Sara', 'PARTNER', 'Admin');
    await mailer.accountCreated('a@b.c', 'Sara', 'STAFF', 'Admin');
    await mailer.notification('a@b.c', 'Hi', 'Body', '/bookings/1', 'PARTNER');
    await mailer.notification('a@b.c', 'Hi', 'Body', '/bookings/1', 'STAFF');
    await mailer.notification('a@b.c', 'Hi', 'Body');
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('StorageService', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-upload-'));
  const storage = new StorageService(config({ UPLOAD_DIR: root }) as never);
  storage.onModuleInit();

  const pdf = Buffer.from('%PDF-1.4 demo');
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2]);
  const webp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP'),
    Buffer.from([1, 2, 3]),
  ]);

  it('sniffs allowed types and rejects others', async () => {
    await expect(storage.save(Buffer.from(''), 'x.pdf')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(storage.save(Buffer.from('hello'), 'x.txt')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const saved = await storage.save(pdf, 'quote?.pdf');
    expect(saved.mimeType).toBe('application/pdf');
    expect(saved.originalName).toBe('quote_.pdf');
    expect(storage.stream(saved.bucketKey)).toBeTruthy();
    await storage.save(png, 'a.png');
    await storage.save(jpg, 'a.jpg');
    await storage.save(webp, 'a.webp');
  });

  it('rejects path traversal and missing files', () => {
    expect(() => storage.stream('../secret')).toThrow(BadRequestException);
    expect(() => storage.stream('missing/file.pdf')).toThrow(NotFoundException);
  });

  it('rejects oversized files', async () => {
    const big = Buffer.alloc(15 * 1024 * 1024 + 1, 0x25);
    big.write('%PDF-', 0);
    await expect(storage.save(big, 'big.pdf')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AuditService', () => {
  it('writes an audit row and swallows failures', async () => {
    const prisma = mockPrisma();
    prisma.auditLog.create.mockResolvedValueOnce({ id: '1' });
    const audit = new AuditService(prisma as never);
    await audit.log({ action: 'booking.create', entityType: 'Booking', entityId: 'b1' });
    expect(prisma.auditLog.create).toHaveBeenCalled();

    prisma.auditLog.create.mockRejectedValueOnce(new Error('down'));
    const error = jest.spyOn((audit as any).logger, 'error').mockImplementation();
    await audit.log({ action: 'x', entityType: 'Y', entityId: '1' });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
