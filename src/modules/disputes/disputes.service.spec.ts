import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DisputeCategory, DisputeTenantStatus, Role } from '../../common/enums';
import { MongoDbDisputeService } from '../../mongoDb/mongo-db-dispute.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  let service: DisputesService;
  let mockMongoDbDisputeService: any;
  let mockMongoDbRentalService: any;
  let mockMongoDbRoomItemService: any;
  let mockMongoDbUploadService: any;

  const validRentalId = new Types.ObjectId().toString();
  const validLandlordId = new Types.ObjectId().toString();
  const validTenantId = new Types.ObjectId().toString();
  const validDisputeId = new Types.ObjectId().toString();
  const validRoomItemId = new Types.ObjectId().toString();
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
    depositAmount: 50000,
  };

  beforeEach(async () => {
    mockMongoDbDisputeService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRentalId: jest.fn(),
      findByRentalIdPaginated: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockMongoDbRentalService = {
      findById: jest.fn(),
    };

    mockMongoDbRoomItemService = {
      findById: jest.fn(),
    };

    mockMongoDbUploadService = {
      findByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: MongoDbDisputeService, useValue: mockMongoDbDisputeService },
        { provide: MongoDbRentalService, useValue: mockMongoDbRentalService },
        { provide: MongoDbRoomItemService, useValue: mockMongoDbRoomItemService },
        { provide: MongoDbUploadService, useValue: mockMongoDbUploadService },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDispute', () => {
    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(null);

      await expect(
        service.createDispute(
          validRentalId,
          {
            category: DisputeCategory.DAMAGE,
            proposedDeduction: 2000,
            description: 'Broken window',
          },
          landlordUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not landlord', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      await expect(
        service.createDispute(
          validRentalId,
          {
            category: DisputeCategory.DAMAGE,
            proposedDeduction: 2000,
            description: 'Broken window',
          },
          tenantUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if specified roomItemId does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbRoomItemService.findById.mockResolvedValue(null);

      await expect(
        service.createDispute(
          validRentalId,
          {
            category: DisputeCategory.DAMAGE,
            proposedDeduction: 2000,
            description: 'Broken window',
            roomItemId: validRoomItemId,
          },
          landlordUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if evidence photo uploads do not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbRoomItemService.findById.mockResolvedValue({ _id: validRoomItemId });
      mockMongoDbUploadService.findByIds.mockResolvedValue([]); // No uploads found

      await expect(
        service.createDispute(
          validRentalId,
          {
            category: DisputeCategory.DAMAGE,
            proposedDeduction: 2000,
            description: 'Broken window',
            evidencePhotos: [validUploadId],
          },
          landlordUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create and return dispute proposal', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbUploadService.findByIds.mockResolvedValue([{ _id: validUploadId }]);

      const createdDispute = {
        _id: validDisputeId,
        rentalId: validRentalId,
        category: DisputeCategory.DAMAGE,
        proposedDeduction: 2000,
        description: 'Broken window handle',
        evidencePhotos: [{ _id: validUploadId }],
        tenantStatus: DisputeTenantStatus.PENDING,
        resolved: false,
      };
      mockMongoDbDisputeService.create.mockResolvedValue(createdDispute);

      const result = await service.createDispute(
        validRentalId,
        {
          category: DisputeCategory.DAMAGE,
          proposedDeduction: 2000,
          description: 'Broken window handle',
          evidencePhotos: [validUploadId],
        },
        landlordUser,
      );

      expect(result).toEqual(createdDispute);
      expect(mockMongoDbDisputeService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rentalId: validRentalId,
          proposedDeduction: 2000,
        }),
      );
    });
  });

  describe('respondToDispute', () => {
    it('should throw ForbiddenException if respondent is not the tenant', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      await expect(
        service.respondToDispute(
          validRentalId,
          validDisputeId,
          { tenantStatus: DisputeTenantStatus.ACCEPTED },
          landlordUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if dispute is already resolved', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbDisputeService.findById.mockResolvedValue({
        _id: validDisputeId,
        rentalId: validRentalId,
        resolved: true,
      });

      await expect(
        service.respondToDispute(
          validRentalId,
          validDisputeId,
          { tenantStatus: DisputeTenantStatus.ACCEPTED },
          tenantUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should accept dispute, set agreedDeduction and mark resolved', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbDisputeService.findById.mockResolvedValue({
        _id: validDisputeId,
        rentalId: validRentalId,
        proposedDeduction: 2500,
        resolved: false,
      });

      const updatedDispute = {
        _id: validDisputeId,
        rentalId: validRentalId,
        proposedDeduction: 2500,
        agreedDeduction: 2500,
        tenantStatus: DisputeTenantStatus.ACCEPTED,
        resolved: true,
      };
      mockMongoDbDisputeService.update.mockResolvedValue(updatedDispute);

      const result = await service.respondToDispute(
        validRentalId,
        validDisputeId,
        {
          tenantStatus: DisputeTenantStatus.ACCEPTED,
          tenantComment: 'Agreed, will cover replacement',
        },
        tenantUser,
      );

      expect(result).toEqual(updatedDispute);
      expect(mockMongoDbDisputeService.update).toHaveBeenCalledWith(
        validDisputeId,
        expect.objectContaining({
          agreedDeduction: 2500,
          resolved: true,
          tenantStatus: DisputeTenantStatus.ACCEPTED,
        }),
      );
    });

    it('should record dispute counter-offer without marking resolved', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbDisputeService.findById.mockResolvedValue({
        _id: validDisputeId,
        rentalId: validRentalId,
        proposedDeduction: 5000,
        resolved: false,
      });

      const updatedDispute = {
        _id: validDisputeId,
        rentalId: validRentalId,
        proposedDeduction: 5000,
        tenantStatus: DisputeTenantStatus.DISPUTED,
        counterAmount: 1500,
        tenantComment: 'Wear and tear, only partial responsibility',
        resolved: false,
      };
      mockMongoDbDisputeService.update.mockResolvedValue(updatedDispute);

      const result = await service.respondToDispute(
        validRentalId,
        validDisputeId,
        {
          tenantStatus: DisputeTenantStatus.DISPUTED,
          counterAmount: 1500,
          tenantComment: 'Wear and tear, only partial responsibility',
        },
        tenantUser,
      );

      expect(result).toEqual(updatedDispute);
      expect(mockMongoDbDisputeService.update).toHaveBeenCalledWith(
        validDisputeId,
        expect.objectContaining({
          tenantStatus: DisputeTenantStatus.DISPUTED,
          counterAmount: 1500,
        }),
      );
    });
  });

  describe('getSettlementSummary', () => {
    it('should compute deposit reconciliation correctly', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental); // depositAmount = 50000

      const disputes = [
        {
          _id: new Types.ObjectId().toString(),
          category: DisputeCategory.DAMAGE,
          proposedDeduction: 5000,
          agreedDeduction: 5000,
          resolved: true,
        },
        {
          _id: new Types.ObjectId().toString(),
          category: DisputeCategory.CLEANING,
          proposedDeduction: 2000,
          agreedDeduction: 1500,
          resolved: true,
        },
        {
          _id: new Types.ObjectId().toString(),
          category: DisputeCategory.UNPAID_BILL,
          proposedDeduction: 3000,
          resolved: false,
        },
      ];
      mockMongoDbDisputeService.findByRentalId.mockResolvedValue(disputes);

      const result = await service.getSettlementSummary(validRentalId, landlordUser);

      expect(result.rentalId).toBe(validRentalId);
      expect(result.settlement).toEqual({
        depositAmount: 50000,
        totalProposedDeductions: 10000,
        totalAgreedDeductions: 6500,
        estimatedRefundAmount: 43500, // 50000 - 6500
        pendingDisputesCount: 1,
        resolvedDisputesCount: 2,
        totalDisputesCount: 3,
      });
      expect(result.disputes).toEqual(disputes);
    });
  });
});
