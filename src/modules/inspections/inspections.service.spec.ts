import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { InspectionStatus, InspectionType, ItemCondition, Role } from '../../common/enums';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { InspectionsService } from './inspections.service';

describe('InspectionsService', () => {
  let service: InspectionsService;
  let mockMongoDbInspectionService: any;
  let mockMongoDbRoomItemService: any;
  let mockMongoDbRentalService: any;
  let mockMongoDbUploadService: any;

  const validRentalId = new Types.ObjectId().toString();
  const validLandlordId = new Types.ObjectId().toString();
  const validTenantId = new Types.ObjectId().toString();
  const validInspectionId = new Types.ObjectId().toString();
  const validUploadId = new Types.ObjectId().toString();

  const landlordUser: JwtPayload = {
    userId: validLandlordId,
    email: 'landlord@example.com',
    role: Role.LANDLORD,
  };

  const tenantUser: JwtPayload = {
    userId: validTenantId,
    email: 'tenant@example.com',
    role: Role.TENANT,
  };

  const outsiderUser: JwtPayload = {
    userId: new Types.ObjectId().toString(),
    email: 'outsider@example.com',
    role: Role.TENANT,
  };

  const mockRental = {
    _id: validRentalId,
    landlordId: validLandlordId,
    tenantId: validTenantId,
    tenantInviteEmail: 'tenant@example.com',
  };

  beforeEach(async () => {
    mockMongoDbInspectionService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdRaw: jest.fn(),
      findByRentalAndType: jest.fn(),
      findByRental: jest.fn(),
      update: jest.fn(),
    };

    mockMongoDbRoomItemService = {
      create: jest.fn(),
      findByInspectionId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockMongoDbRentalService = {
      findById: jest.fn(),
    };

    mockMongoDbUploadService = {
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: MongoDbInspectionService, useValue: mockMongoDbInspectionService },
        { provide: MongoDbRoomItemService, useValue: mockMongoDbRoomItemService },
        { provide: MongoDbRentalService, useValue: mockMongoDbRentalService },
        { provide: MongoDbUploadService, useValue: mockMongoDbUploadService },
      ],
    }).compile();

    service = module.get<InspectionsService>(InspectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInspection', () => {
    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(null);

      await expect(
        service.createInspection(validRentalId, { type: InspectionType.MOVE_IN }, landlordUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access to rental', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      await expect(
        service.createInspection(validRentalId, { type: InspectionType.MOVE_IN }, outsiderUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if inspection of same type already exists', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbInspectionService.findByRentalAndType.mockResolvedValue({
        _id: validInspectionId,
      });

      await expect(
        service.createInspection(validRentalId, { type: InspectionType.MOVE_IN }, landlordUser),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return new inspection in draft status', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbInspectionService.findByRentalAndType.mockResolvedValue(null);

      const createdDoc = {
        _id: validInspectionId,
        rentalId: validRentalId,
        type: InspectionType.MOVE_IN,
        status: InspectionStatus.DRAFT,
      };
      mockMongoDbInspectionService.create.mockResolvedValue(createdDoc);

      const result = await service.createInspection(
        validRentalId,
        { type: InspectionType.MOVE_IN },
        landlordUser,
      );

      expect(mockMongoDbInspectionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rentalId: validRentalId,
          type: InspectionType.MOVE_IN,
        }),
      );
      expect(result).toEqual(createdDoc);
    });
  });

  describe('addRoomItem', () => {
    it('should throw ForbiddenException if inspection is locked', async () => {
      mockMongoDbInspectionService.findById.mockResolvedValue({
        _id: validInspectionId,
        rentalId: validRentalId,
        status: InspectionStatus.LOCKED,
      });

      await expect(
        service.addRoomItem(
          validInspectionId,
          {
            roomName: 'Living Room',
            itemName: 'Fan',
            condition: ItemCondition.GOOD,
          },
          landlordUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if photo upload IDs are not found', async () => {
      mockMongoDbInspectionService.findById.mockResolvedValue({
        _id: validInspectionId,
        rentalId: validRentalId,
        status: InspectionStatus.DRAFT,
      });
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbUploadService.findByIds.mockResolvedValue([]); // No uploads found

      await expect(
        service.addRoomItem(
          validInspectionId,
          {
            roomName: 'Living Room',
            itemName: 'Fan',
            condition: ItemCondition.GOOD,
            photos: [validUploadId],
          },
          landlordUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully add room item with valid upload photo IDs', async () => {
      mockMongoDbInspectionService.findById.mockResolvedValue({
        _id: validInspectionId,
        rentalId: validRentalId,
        status: InspectionStatus.DRAFT,
      });
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbUploadService.findByIds.mockResolvedValue([{ _id: validUploadId }]);

      const createdItem = {
        _id: new Types.ObjectId().toString(),
        inspectionId: validInspectionId,
        roomName: 'Living Room',
        itemName: 'Ceiling Fan',
        condition: ItemCondition.GOOD,
        photos: [{ _id: validUploadId }],
      };
      mockMongoDbRoomItemService.create.mockResolvedValue(createdItem);

      const result = await service.addRoomItem(
        validInspectionId,
        {
          roomName: 'Living Room',
          itemName: 'Ceiling Fan',
          condition: ItemCondition.GOOD,
          photos: [validUploadId],
        },
        landlordUser,
      );

      expect(result).toEqual(createdItem);
    });
  });

  describe('signOff', () => {
    it('should mark pending_signatures when only one party signs off', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(validInspectionId),
        rentalId: validRentalId,
        type: InspectionType.MOVE_IN,
        status: InspectionStatus.DRAFT,
        landlordSigned: false,
        tenantSigned: false,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return this;
        },
      };

      mockMongoDbInspectionService.findByIdRaw.mockResolvedValue(mockDoc);
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbRoomItemService.findByInspectionId.mockResolvedValue([]);

      const result = await service.signOff(validInspectionId, { agree: true }, landlordUser);

      expect(mockDoc.landlordSigned).toBe(true);
      expect(mockDoc.status).toBe(InspectionStatus.PENDING_SIGNATURES);
      expect(mockDoc.save).toHaveBeenCalled();
      expect(result.status).toBe(InspectionStatus.PENDING_SIGNATURES);
    });

    it('should compute rootHash and lock inspection when both parties sign off', async () => {
      const mockDoc = {
        _id: new Types.ObjectId(validInspectionId),
        rentalId: validRentalId,
        type: InspectionType.MOVE_IN,
        status: InspectionStatus.PENDING_SIGNATURES,
        landlordSigned: true,
        landlordSignedAt: new Date('2026-10-21T10:00:00Z'),
        tenantSigned: false,
        rootHash: null,
        lockedAt: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return this;
        },
      };

      mockMongoDbInspectionService.findByIdRaw.mockResolvedValue(mockDoc);
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbRoomItemService.findByInspectionId.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          roomName: 'Living Room',
          itemName: 'Fan',
          condition: ItemCondition.GOOD,
          photos: [
            {
              _id: new Types.ObjectId(validUploadId),
              sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
          ],
        },
      ]);

      const result = await service.signOff(validInspectionId, { agree: true }, tenantUser);

      expect(mockDoc.tenantSigned).toBe(true);
      expect(mockDoc.status).toBe(InspectionStatus.LOCKED);
      expect(mockDoc.rootHash).toBeDefined();
      expect(mockDoc.rootHash).toHaveLength(64);
      expect(mockDoc.lockedAt).toBeDefined();
      expect(mockDoc.save).toHaveBeenCalled();
    });
  });
});
