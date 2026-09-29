import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { EnvConfig } from '../../core/config/env.config';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  {
    mime: 'application/pdf',
    ext: 'pdf',
    test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  },
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/**
 * Private file storage on local disk (plan 04 §7 fallback until object storage is chosen).
 * Files are stored under random keys, types are sniffed from magic bytes (the client's
 * Content-Type and filename are ignored), and nothing is served without an authz check.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly root: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.root = path.resolve(config.get('UPLOAD_DIR', { infer: true }));
  }

  onModuleInit() {
    fs.mkdirSync(this.root, { recursive: true, mode: 0o700 });
  }

  /** Validates and writes a buffer. Returns metadata to persist on StoredFile. */
  async save(buffer: Buffer, originalName: string) {
    if (!buffer?.length) throw new BadRequestException('The file is empty');
    if (buffer.length > MAX_UPLOAD_BYTES)
      throw new BadRequestException('Files must be 15 MB or smaller');
    const kind = SIGNATURES.find((s) => s.test(buffer));
    if (!kind) throw new BadRequestException('Upload a PDF, JPEG, PNG or WEBP file');

    const bucketKey = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind.ext}`;
    const target = this.resolve(bucketKey);
    await fs.promises.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.promises.writeFile(target, buffer, { mode: 0o600 });

    return {
      bucketKey,
      mimeType: kind.mime,
      sizeBytes: buffer.length,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      originalName: path
        .basename(originalName || 'upload')
        .replace(/[^\w.\- ]+/g, '_')
        .slice(0, 120),
    };
  }

  stream(bucketKey: string) {
    const target = this.resolve(bucketKey);
    if (!fs.existsSync(target)) throw new NotFoundException('File not found');
    return fs.createReadStream(target);
  }

  private resolve(bucketKey: string) {
    const target = path.resolve(this.root, bucketKey);
    if (!target.startsWith(this.root + path.sep)) throw new BadRequestException('Invalid file key');
    return target;
  }
}
