import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  ComparisonDiffStatus,
  DisputeCategory,
  DisputeTenantStatus,
  InspectionStatus,
  InspectionType,
  ItemCondition,
  RentalStatus,
  Role,
} from '../../common/enums';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ComparisonService } from '../comparison/comparison.service';
import { DisputesService } from '../disputes/disputes.service';
import { PdfReportBuilder } from './pdf-report.builder';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockMongoDbRentalService: any;
  let mockMongoDbInspectionService: any;
  let mockComparisonService: any;
  let mockDisputesService: any;

  const validRentalId = new Types.ObjectId().toString();
  const validLandlordId = new Types.ObjectId().toString();
  const validTenantId = new Types.ObjectId().toString();

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
    landlordId: {
      _id: validLandlordId,
      name: 'Ramesh Sharma',
      email: 'landlord@example.com',
      phone: '+919876543201',
    },
    tenantId: {
      _id: validTenantId,
      name: 'Priya Verma',
      email: 'tenant@example.com',
      phone: '+919876543202',
    },
    propertyAddress: {
      line1: 'Flat 302, Palm Residency',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
    monthlyRent: 40000,
    depositAmount: 120000,
    status: RentalStatus.ACTIVE,
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: new Date('2027-10-31T00:00:00.000Z'),
  };

  beforeEach(async () => {
    mockMongoDbRentalService = {
      findById: jest.fn(),
    };

    mockMongoDbInspectionService = {
      findByRentalAndType: jest.fn(),
    };

    mockComparisonService = {
      getComparison: jest.fn(),
    };

    mockDisputesService = {
      getSettlementSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        PdfReportBuilder,
        { provide: MongoDbRentalService, useValue: mockMongoDbRentalService },
        { provide: MongoDbInspectionService, useValue: mockMongoDbInspectionService },
        { provide: ComparisonService, useValue: mockComparisonService },
        { provide: DisputesService, useValue: mockDisputesService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateReport', () => {
    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(null);

      await expect(service.generateReport(validRentalId, landlordUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access to rental', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      await expect(service.generateReport(validRentalId, outsiderUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should successfully build a standard PDF report with valid buffer and header', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      mockMongoDbInspectionService.findByRentalAndType.mockImplementation(
        async (_id: string, type: InspectionType) => {
          if (type === InspectionType.MOVE_IN) {
            return {
              _id: new Types.ObjectId().toString(),
              type: InspectionType.MOVE_IN,
              status: InspectionStatus.LOCKED,
              landlordSigned: true,
              tenantSigned: true,
              rootHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              lockedAt: new Date(),
            };
          }
          if (type === InspectionType.MOVE_OUT) {
            return {
              _id: new Types.ObjectId().toString(),
              type: InspectionType.MOVE_OUT,
              status: InspectionStatus.LOCKED,
              landlordSigned: true,
              tenantSigned: true,
              rootHash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb',
              lockedAt: new Date(),
            };
          }
          return null;
        },
      );

      mockComparisonService.getComparison.mockResolvedValue({
        rentalId: validRentalId,
        moveInLocked: true,
        moveOutLocked: true,
        summary: {
          totalItems: 2,
          unchangedCount: 1,
          minorWearCount: 0,
          damagedCount: 1,
          missingCount: 0,
          addedCount: 0,
        },
        comparisons: [
          {
            roomName: 'Living Room',
            itemName: 'Ceiling Fan',
            diffStatus: ComparisonDiffStatus.UNCHANGED,
            moveIn: {
              condition: ItemCondition.GOOD,
              notes: 'Working',
              photos: [
                {
                  _id: new Types.ObjectId().toString(),
                  fileName: 'fan.jpg',
                  sha256Hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
                },
              ],
            },
            moveOut: {
              condition: ItemCondition.GOOD,
              notes: 'Still working',
              photos: [],
            },
          },
          {
            roomName: 'Kitchen',
            itemName: 'Sink Tap',
            diffStatus: ComparisonDiffStatus.DAMAGED_SINCE_MOVE_IN,
            moveIn: {
              condition: ItemCondition.GOOD,
              notes: 'No leak',
              photos: [],
            },
            moveOut: {
              condition: ItemCondition.DAMAGED,
              notes: 'Handle broken',
              photos: [],
            },
          },
        ],
      });

      mockDisputesService.getSettlementSummary.mockResolvedValue({
        rentalId: validRentalId,
        settlement: {
          depositAmount: 120000,
          totalProposedDeductions: 5000,
          totalAgreedDeductions: 5000,
          estimatedRefundAmount: 115000,
          pendingDisputesCount: 0,
          resolvedDisputesCount: 1,
          totalDisputesCount: 1,
        },
        disputes: [
          {
            _id: new Types.ObjectId().toString(),
            category: DisputeCategory.DAMAGE,
            proposedDeduction: 5000,
            agreedDeduction: 5000,
            description: 'Sink tap replacement',
            tenantStatus: DisputeTenantStatus.ACCEPTED,
            resolved: true,
          },
        ],
      });

      const result = await service.generateReport(validRentalId, tenantUser);

      expect(result).toBeDefined();
      expect(result.filename).toBe(`GharProof-Inspection-Report-${validRentalId}.pdf`);
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(100);

      // Verify PDF magic header bytes: %PDF-
      const magicBytes = result.buffer.subarray(0, 5).toString('ascii');
      expect(magicBytes).toBe('%PDF-');
    });
  });
});
