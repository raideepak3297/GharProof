import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Types } from 'mongoose';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let mockMongoDbUploadService: any;
  let mockConfigService: any;

  const testUploadDir = path.join(__dirname, '../../../test-uploads-scratch');

  beforeEach(async () => {
    mockMongoDbUploadService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      findByHash: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
        if (key === 'storage.uploadDir') {
          return testUploadDir;
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: MongoDbUploadService,
          useValue: mockMongoDbUploadService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  afterAll(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processSingleUpload', () => {
    it('should throw BadRequestException if no file is provided', async () => {
      await expect(service.processSingleUpload(null as any, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file MIME type is not allowed', async () => {
      const invalidFile = {
        originalname: 'script.sh',
        mimetype: 'application/x-sh',
        size: 100,
        buffer: Buffer.from('echo hello'),
      } as Express.Multer.File;

      await expect(service.processSingleUpload(invalidFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if file exceeds max size', async () => {
      const oversizedFile = {
        originalname: 'huge.jpg',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
        buffer: Buffer.alloc(100),
      } as Express.Multer.File;

      await expect(service.processSingleUpload(oversizedFile, 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should compute SHA-256 hash and persist upload metadata', async () => {
      const fileBuffer = Buffer.from('mock-photo-binary-content');
      const expectedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const mockFile = {
        originalname: 'living-room-wall.jpg',
        mimetype: 'image/jpeg',
        size: fileBuffer.length,
        buffer: fileBuffer,
      } as Express.Multer.File;

      const mockCreatedUpload = {
        _id: new Types.ObjectId(),
        originalName: 'living-room-wall.jpg',
        fileName: '123456-abcdef.jpg',
        mimeType: 'image/jpeg',
        size: fileBuffer.length,
        path: '/uploads/2026-10/123456-abcdef.jpg',
        sha256Hash: expectedHash,
        uploadedBy: new Types.ObjectId(),
      };

      mockMongoDbUploadService.create.mockResolvedValue(mockCreatedUpload);

      const result = await service.processSingleUpload(mockFile, '507f1f77bcf86cd799439011');

      expect(mockMongoDbUploadService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'living-room-wall.jpg',
          mimeType: 'image/jpeg',
          size: fileBuffer.length,
          sha256Hash: expectedHash,
          uploadedBy: '507f1f77bcf86cd799439011',
        }),
      );
      expect(result).toEqual(mockCreatedUpload);
    });
  });

  describe('processMultipleUploads', () => {
    it('should throw BadRequestException if files array is empty', async () => {
      await expect(service.processMultipleUploads([], 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process multiple files sequentially', async () => {
      const file1 = {
        originalname: 'photo1.jpg',
        mimetype: 'image/jpeg',
        size: 50,
        buffer: Buffer.from('photo-1-content'),
      } as Express.Multer.File;

      const file2 = {
        originalname: 'photo2.png',
        mimetype: 'image/png',
        size: 60,
        buffer: Buffer.from('photo-2-content'),
      } as Express.Multer.File;

      mockMongoDbUploadService.create
        .mockResolvedValueOnce({ _id: '1', originalName: 'photo1.jpg' })
        .mockResolvedValueOnce({ _id: '2', originalName: 'photo2.png' });

      const results = await service.processMultipleUploads([file1, file2], 'user123');

      expect(results).toHaveLength(2);
      expect(mockMongoDbUploadService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUploadById', () => {
    it('should throw NotFoundException if upload does not exist', async () => {
      mockMongoDbUploadService.findById.mockResolvedValue(null);

      await expect(service.getUploadById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return upload document if found', async () => {
      const mockDoc = { _id: 'upload123', originalName: 'test.jpg' };
      mockMongoDbUploadService.findById.mockResolvedValue(mockDoc);

      const result = await service.getUploadById('upload123');
      expect(result).toEqual(mockDoc);
    });
  });
});
