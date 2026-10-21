import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  ComparisonDiffStatus,
  InspectionStatus,
  InspectionType,
  ItemCondition,
  Role,
} from '../../common/enums';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ComparisonService } from './comparison.service';

describe('ComparisonService', () => {
  let service: ComparisonService;
  let mockMongoDbRentalService: any;
  let mockMongoDbInspectionService: any;
  let mockMongoDbRoomItemService: any;

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
    landlordId: validLandlordId,
    tenantId: validTenantId,
    tenantInviteEmail: 'tenant@example.com',
  };

  beforeEach(async () => {
    mockMongoDbRentalService = {
      findById: jest.fn(),
    };

    mockMongoDbInspectionService = {
      findByRentalAndType: jest.fn(),
    };

    mockMongoDbRoomItemService = {
      findByInspectionId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonService,
        { provide: MongoDbRentalService, useValue: mockMongoDbRentalService },
        { provide: MongoDbInspectionService, useValue: mockMongoDbInspectionService },
        { provide: MongoDbRoomItemService, useValue: mockMongoDbRoomItemService },
      ],
    }).compile();

    service = module.get<ComparisonService>(ComparisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getComparison', () => {
    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(null);

      await expect(service.getComparison(validRentalId, landlordUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user has no access to rental', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      await expect(service.getComparison(validRentalId, outsiderUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return empty comparisons when no inspections exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);
      mockMongoDbInspectionService.findByRentalAndType.mockResolvedValue(null);

      const result = await service.getComparison(validRentalId, landlordUser);

      expect(result.rentalId).toBe(validRentalId);
      expect(result.moveInInspectionId).toBeNull();
      expect(result.moveInLocked).toBe(false);
      expect(result.moveOutInspectionId).toBeNull();
      expect(result.moveOutLocked).toBe(false);
      expect(result.comparisons).toEqual([]);
      expect(result.summary).toEqual({
        totalItems: 0,
        unchangedCount: 0,
        minorWearCount: 0,
        damagedCount: 0,
        missingCount: 0,
        addedCount: 0,
      });
    });

    it('should correctly classify condition changes and compute accurate summary', async () => {
      const moveInInspectionId = new Types.ObjectId().toString();
      const moveOutInspectionId = new Types.ObjectId().toString();

      mockMongoDbRentalService.findById.mockResolvedValue(mockRental);

      mockMongoDbInspectionService.findByRentalAndType.mockImplementation(
        async (_rentalId: string, type: InspectionType) => {
          if (type === InspectionType.MOVE_IN) {
            return {
              _id: moveInInspectionId,
              type: InspectionType.MOVE_IN,
              status: InspectionStatus.LOCKED,
            };
          }
          if (type === InspectionType.MOVE_OUT) {
            return {
              _id: moveOutInspectionId,
              type: InspectionType.MOVE_OUT,
              status: InspectionStatus.LOCKED,
            };
          }
          return null;
        },
      );

      // Move-in items:
      // 1. Living Room - Fan (GOOD)
      // 2. Kitchen - Microwave (GOOD)
      // 3. Bedroom - Bed Frame (GOOD)
      // 4. Balcony - Plant Stand (FAIR)
      const moveInItems = [
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveInInspectionId,
          roomName: 'Living Room',
          itemName: 'Fan',
          condition: ItemCondition.GOOD,
          notes: 'Works well',
          photos: ['photo-1'],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveInInspectionId,
          roomName: 'Kitchen',
          itemName: 'Microwave',
          condition: ItemCondition.GOOD,
          notes: 'Clean',
          photos: ['photo-2'],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveInInspectionId,
          roomName: 'Bedroom',
          itemName: 'Bed Frame',
          condition: ItemCondition.GOOD,
          notes: 'Sturdy',
          photos: [],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveInInspectionId,
          roomName: 'Balcony',
          itemName: 'Plant Stand',
          condition: ItemCondition.GOOD,
          notes: 'Old stand',
          photos: [],
        },
      ];

      // Move-out items:
      // 1. Living Room - Fan (GOOD) -> UNCHANGED
      // 2. Kitchen - Microwave (DAMAGED) -> DAMAGED_SINCE_MOVE_IN
      // 3. Bedroom - Bed Frame (MINOR_SCRATCH) -> MINOR_WEAR
      // (Balcony Plant Stand omitted) -> MISSING_AT_MOVE_OUT
      // 4. Hallway - Mirror (GOOD) (new) -> ADDED_DURING_TENANCY
      const moveOutItems = [
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveOutInspectionId,
          roomName: 'Living Room',
          itemName: 'Fan',
          condition: ItemCondition.GOOD,
          notes: 'Still working',
          photos: ['photo-out-1'],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveOutInspectionId,
          roomName: 'Kitchen',
          itemName: 'Microwave',
          condition: ItemCondition.DAMAGED,
          notes: 'Door broken',
          photos: ['photo-out-2'],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveOutInspectionId,
          roomName: 'Bedroom',
          itemName: 'Bed Frame',
          condition: ItemCondition.MINOR_SCRATCH,
          notes: 'Scratched leg',
          photos: [],
        },
        {
          _id: new Types.ObjectId().toString(),
          inspectionId: moveOutInspectionId,
          roomName: 'Hallway',
          itemName: 'Mirror',
          condition: ItemCondition.GOOD,
          notes: 'Left by tenant',
          photos: [],
        },
      ];

      mockMongoDbRoomItemService.findByInspectionId.mockImplementation(
        async (inspectionId: string) => {
          if (inspectionId === moveInInspectionId) return moveInItems;
          if (inspectionId === moveOutInspectionId) return moveOutItems;
          return [];
        },
      );

      const result = await service.getComparison(validRentalId, tenantUser);

      expect(result.moveInInspectionId).toBe(moveInInspectionId);
      expect(result.moveInLocked).toBe(true);
      expect(result.moveOutInspectionId).toBe(moveOutInspectionId);
      expect(result.moveOutLocked).toBe(true);
      expect(result.comparisons).toHaveLength(5);

      // Verify alphabetical sorting by roomName then itemName
      expect(result.comparisons.map((c) => `${c.roomName}:::${c.itemName}`)).toEqual([
        'Balcony:::Plant Stand',
        'Bedroom:::Bed Frame',
        'Hallway:::Mirror',
        'Kitchen:::Microwave',
        'Living Room:::Fan',
      ]);

      const balconyComp = result.comparisons.find((c) => c.itemName === 'Plant Stand');
      expect(balconyComp?.diffStatus).toBe(ComparisonDiffStatus.MISSING_AT_MOVE_OUT);
      expect(balconyComp?.moveIn).toBeDefined();
      expect(balconyComp?.moveOut).toBeNull();

      const bedroomComp = result.comparisons.find((c) => c.itemName === 'Bed Frame');
      expect(bedroomComp?.diffStatus).toBe(ComparisonDiffStatus.MINOR_WEAR);

      const hallwayComp = result.comparisons.find((c) => c.itemName === 'Mirror');
      expect(hallwayComp?.diffStatus).toBe(ComparisonDiffStatus.ADDED_DURING_TENANCY);
      expect(hallwayComp?.moveIn).toBeNull();
      expect(hallwayComp?.moveOut).toBeDefined();

      const kitchenComp = result.comparisons.find((c) => c.itemName === 'Microwave');
      expect(kitchenComp?.diffStatus).toBe(ComparisonDiffStatus.DAMAGED_SINCE_MOVE_IN);

      const livingRoomComp = result.comparisons.find((c) => c.itemName === 'Fan');
      expect(livingRoomComp?.diffStatus).toBe(ComparisonDiffStatus.UNCHANGED);

      // Summary checks
      expect(result.summary).toEqual({
        totalItems: 5,
        unchangedCount: 1,
        minorWearCount: 1,
        damagedCount: 1,
        missingCount: 1,
        addedCount: 1,
      });
    });
  });
});
