import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { IUpload } from './interfaces/upload.interface';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly baseUploadDir: string;

  constructor(
    private readonly mongoDbUploadService: MongoDbUploadService,
    private readonly configService: ConfigService,
  ) {
    this.baseUploadDir = this.configService.get<string>('storage.uploadDir', './uploads');
    this.ensureDirectoryExists(this.baseUploadDir);
  }

  async processSingleUpload(file: Express.Multer.File, userId: string): Promise<IUpload> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    this.validateFile(file);

    // Compute SHA-256 hash of file content
    const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Generate unique storage filename and path
    const now = new Date();
    const subFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetDir = path.join(this.baseUploadDir, subFolder);
    this.ensureDirectoryExists(targetDir);

    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueFileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const fullDiskPath = path.join(targetDir, uniqueFileName);
    const relativeUrlPath = path.join('/uploads', subFolder, uniqueFileName);

    try {
      await fs.promises.writeFile(fullDiskPath, file.buffer);
    } catch (err) {
      this.logger.error(`Failed to write file to disk: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to store file on disk');
    }

    return this.mongoDbUploadService.create({
      originalName: file.originalname,
      fileName: uniqueFileName,
      mimeType: file.mimetype,
      size: file.size,
      path: relativeUrlPath,
      sha256Hash,
      uploadedBy: userId,
    });
  }

  async processMultipleUploads(files: Express.Multer.File[], userId: string): Promise<IUpload[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for upload');
    }

    const uploads: IUpload[] = [];
    for (const file of files) {
      const upload = await this.processSingleUpload(file, userId);
      uploads.push(upload);
    }
    return uploads;
  }

  async getUploadById(id: string): Promise<IUpload> {
    const upload = await this.mongoDbUploadService.findById(id);
    if (!upload) {
      throw new NotFoundException(`Upload with ID ${id} not found`);
    }
    return upload;
  }

  async getFilePath(
    id: string,
  ): Promise<{ diskPath: string; mimeType: string; originalName: string }> {
    const upload = await this.getUploadById(id);
    // Relative path starts with /uploads, map back to baseUploadDir
    const relativePart = upload.path.replace(/^\/uploads\/?/, '');
    const diskPath = path.join(this.baseUploadDir, relativePart);

    if (!fs.existsSync(diskPath)) {
      throw new NotFoundException(`File for upload ID ${id} does not exist on disk`);
    }

    return {
      diskPath,
      mimeType: upload.mimeType,
      originalName: upload.originalName,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not supported. Allowed types: JPEG, PNG, WEBP, HEIC, PDF.`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      );
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
