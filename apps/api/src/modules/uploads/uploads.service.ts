import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { UploadCategory, UploadedFileMeta, UploadResponseDto } from '@gnk/types';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadBaseDir = path.resolve(process.cwd(), 'uploads');
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  private readonly maxFileSize = 15 * 1024 * 1024; // 15MB

  constructor() {
    this.ensureDirectoryExists(path.join(this.uploadBaseDir, 'documents'));
    this.ensureDirectoryExists(path.join(this.uploadBaseDir, 'payment-slips'));
    this.ensureDirectoryExists(path.join(this.uploadBaseDir, 'logos'));
  }

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private sanitizeFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomHex = crypto.randomBytes(6).toString('hex');
    const timestamp = Date.now();
    return `${base}_${timestamp}_${randomHex}${ext}`;
  }

  public validateFile(file: any) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, PDF`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds max limit of 15MB`
      );
    }
  }

  public async saveUploadedFile(
    file: any,
    category: UploadCategory = 'GENERAL',
    agentId?: string
  ): Promise<UploadedFileMeta> {
    this.validateFile(file);

    const subDirName = category === 'PAYMENT_SLIP' ? 'payment-slips' : category === 'AGENCY_LOGO' ? 'logos' : 'documents';
    const targetFolder = path.join(this.uploadBaseDir, subDirName);
    this.ensureDirectoryExists(targetFolder);

    const safeFilename = this.sanitizeFilename(file.originalname);
    const destinationPath = path.join(targetFolder, safeFilename);

    // Write file buffer to disk
    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, destinationPath);
    } else {
      throw new BadRequestException('Unable to process file content');
    }

    const fileId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const publicUrl = `/api/v1/uploads/file/${subDirName}/${safeFilename}`;

    const metadata: UploadedFileMeta = {
      id: fileId,
      originalName: file.originalname,
      filename: safeFilename,
      category,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: publicUrl,
      uploadedByAgentId: agentId,
      uploadedAt: new Date().toISOString(),
    };

    this.logger.log(`Saved file [${metadata.id}] ${file.originalname} -> ${publicUrl}`);
    return metadata;
  }

  public getFilePath(subDir: string, filename: string): { filePath: string; mimeType: string } {
    // Prevent directory traversal attacks
    const sanitizedFilename = path.basename(filename);
    const sanitizedSubDir = path.basename(subDir);
    const targetFile = path.join(this.uploadBaseDir, sanitizedSubDir, sanitizedFilename);

    if (!fs.existsSync(targetFile)) {
      throw new NotFoundException(`Requested file '${filename}' was not found`);
    }

    const ext = path.extname(sanitizedFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';

    return { filePath: targetFile, mimeType };
  }
}
