import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { UploadsService } from './uploads.service';
import { UploadCategory, UploadResponseDto } from '@gnk/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body('category') category?: UploadCategory,
    @Body('agentId') agentId?: string
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }

    const assignedCategory: UploadCategory = category || 'DTS_LICENSE';
    const metadata = await this.uploadsService.saveUploadedFile(file, assignedCategory, agentId);

    return {
      success: true,
      file: metadata,
      message: `${assignedCategory} document uploaded successfully`,
    };
  }

  @Post('payment-slip')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPaymentSlip(
    @UploadedFile() file: any,
    @Body('bookingId') bookingId?: string,
    @Body('agentId') agentId?: string
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Payment slip image or PDF is required');
    }

    const metadata = await this.uploadsService.saveUploadedFile(file, 'PAYMENT_SLIP', agentId);

    return {
      success: true,
      file: metadata,
      message: `Bank payment deposit slip uploaded successfully for booking ${bookingId || 'submission'}`,
    };
  }

  @Get('file/:subDir/:filename')
  streamUploadedFile(
    @Param('subDir') subDir: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const { filePath, mimeType } = this.uploadsService.getFilePath(subDir, filename);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Get('health')
  getUploadStatus() {
    return {
      status: 'ONLINE',
      supportedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      maxSizeMB: 15,
      storageType: 'LOCAL_SECURE_DISK',
    };
  }
}
