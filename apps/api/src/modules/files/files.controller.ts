import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { FilePurpose } from '@prisma/client';
import type { Response } from 'express';
import { UUID } from '../../core/http/parse-uuid';
import { MAX_UPLOAD_BYTES } from '../../infra/storage/storage.service';
import type { PartnerActor, StaffActor } from '../auth/auth.types';
import { CurrentActor, RequirePermission } from '../auth/decorators';
import { FilesService, type UploadedBlob } from './files.service';

const upload = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
});
const PARTNER_PURPOSES: FilePurpose[] = ['KYC', 'PAYMENT_PROOF', 'PASSPORT_COPY', 'LOGO'];

@Controller('partner/files')
export class PartnerFilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 3600_000 } })
  @UseInterceptors(upload)
  upload(
    @CurrentActor() actor: PartnerActor,
    @UploadedFile() file: UploadedBlob | undefined,
    @Query('purpose') purpose: FilePurpose,
  ) {
    if (!PARTNER_PURPOSES.includes(purpose))
      throw new BadRequestException('Unknown upload purpose');
    if (!file) throw new BadRequestException('Attach a file');
    return this.files.uploadForPartner(actor, purpose, file);
  }

  @Get(':id')
  download(
    @CurrentActor() actor: PartnerActor,
    @Param('id', UUID) id: string,
    @Res() res: Response,
  ) {
    return this.files.streamForPartner(actor, id, res);
  }
}

@Controller('admin/files')
export class AdminFilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @RequirePermission('payments:verify')
  @UseInterceptors(upload)
  upload(
    @CurrentActor() actor: StaffActor,
    @UploadedFile() file: UploadedBlob | undefined,
    @Query('accountId') accountId?: string,
  ) {
    if (!file) throw new BadRequestException('Attach a file');
    return this.files.uploadForStaff(actor, 'PAYMENT_PROOF', file, accountId);
  }

  @Get(':id')
  download(@CurrentActor() actor: StaffActor, @Param('id', UUID) id: string, @Res() res: Response) {
    return this.files.streamForStaff(actor, id, res);
  }
}
