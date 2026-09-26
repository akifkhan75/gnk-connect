import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { FilePurpose, StoredFile } from '@prisma/client';
import type { Response } from 'express';
import type { Permission } from '@gnk/types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StorageService } from '../../infra/storage/storage.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';

// Which staff permission lets someone open a file of each purpose.
const STAFF_READ: Record<FilePurpose, Permission> = {
  KYC: 'partners:read',
  PAYMENT_PROOF: 'payments:read',
  PASSPORT_COPY: 'bookings:read',
  INVOICE: 'bookings:read',
  LOGO: 'partners:read',
  VOUCHER: 'ledger:read',
};

export interface UploadedBlob {
  buffer: Buffer;
  originalname: string;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadForPartner(actor: PartnerActor, purpose: FilePurpose, file: UploadedBlob) {
    const saved = await this.storage.save(file.buffer, file.originalname);
    const row = await this.prisma.storedFile.create({
      data: {
        ...saved,
        purpose,
        ownerRealm: 'PARTNER',
        ownerUserId: actor.userId,
        accountId: actor.accountId,
        scanStatus: 'CLEAN',
      },
    });
    return this.toDto(row);
  }

  async uploadForStaff(
    actor: StaffActor,
    purpose: FilePurpose,
    file: UploadedBlob,
    accountId?: string,
  ) {
    const saved = await this.storage.save(file.buffer, file.originalname);
    const row = await this.prisma.storedFile.create({
      data: {
        ...saved,
        purpose,
        ownerRealm: 'STAFF',
        ownerUserId: actor.userId,
        accountId: accountId ?? null,
        scanStatus: 'CLEAN',
      },
    });
    return this.toDto(row);
  }

  /** Partners may only open files that belong to their active account. */
  async streamForPartner(actor: PartnerActor, id: string, res: Response) {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file || file.accountId !== actor.accountId) throw new NotFoundException('File not found');
    this.pipe(file, res);
  }

  async streamForStaff(actor: StaffActor, id: string, res: Response) {
    const file = await this.prisma.storedFile.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    if (!actor.permissions.has(STAFF_READ[file.purpose]))
      throw new ForbiddenException('You do not have access to this file');
    this.pipe(file, res);
  }

  /** Ensures a file id supplied in a request body belongs to the partner and has the right purpose. */
  async assertPartnerFile(accountId: string, fileId: string, purpose: FilePurpose) {
    const file = await this.prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file || file.accountId !== accountId || file.purpose !== purpose) {
      throw new ForbiddenException('The uploaded file could not be used. Upload it again.');
    }
    return file;
  }

  private pipe(file: StoredFile, res: Response) {
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', String(file.sizeBytes));
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.originalName.replace(/"/g, '')}"`,
    );
    this.storage.stream(file.bucketKey).pipe(res);
  }

  toDto(f: StoredFile) {
    return {
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      purpose: f.purpose,
      createdAt: f.createdAt.toISOString(),
    };
  }
}
