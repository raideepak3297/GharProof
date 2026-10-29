import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { RentalStatus, Role } from '../../common/enums';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbUserService } from '../../mongoDb/mongo-db-user.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService', () => {
  let service: RentalsService;
  let mockMongoDbRentalService: any;

  const validLandlordId = new Types.ObjectId().toString();
  const validTenantId = new Types.ObjectId().toString();
  const validRentalId = new Types.ObjectId().toString();

  const mockRentalDoc = {
    _id: new Types.ObjectId(validRentalId),
    landlordId: new Types.ObjectId(validLandlordId),
    tenantId: null,
    tenantInviteEmail: 'tenant@example.com',
    tenantInvitePhone: '+919876543210',
    propertyAddress: {
      line1: 'Flat 101, Palm Grove',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
    monthlyRent: 30000,
    depositAmount: 90000,
    status: RentalStatus.INVITED,
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: new Date('2027-10-31T00:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject: function () {
      return this;
    },
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockMongoDbRentalService = {
      create: jest.fn(),
      findUserRentals: jest.fn(),
      findById: jest.fn(),
      findByIdRaw: jest.fn(),
    };

    const mockMongoDbUserService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        {
          provide: MongoDbRentalService,
          useValue: mockMongoDbRentalService,
        },
        {
          provide: MongoDbUserService,
          useValue: mockMongoDbUserService,
        },
      ],
    }).compile();

    service = module.get<RentalsService>(RentalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      propertyAddress: {
        line1: 'Flat 101, Palm Grove',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      },
      monthlyRent: 30000,
      depositAmount: 90000,
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2027-10-31T00:00:00.000Z',
      tenantInviteEmail: 'tenant@example.com',
      tenantInvitePhone: '+919876543210',
    };

    it('should create rental with INVITED status when tenantInviteEmail is present', async () => {
      mockMongoDbRentalService.create.mockResolvedValue(mockRentalDoc);

      const result = await service.create(validLandlordId, createDto);

      expect(mockMongoDbRentalService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RentalStatus.INVITED,
          tenantInviteEmail: 'tenant@example.com',
          monthlyRent: 30000,
        }),
      );
      expect(result._id.toString()).toBe(validRentalId);
      expect(result.status).toBe(RentalStatus.INVITED);
    });

    it('should throw BadRequestException if endDate is before or equal to startDate', async () => {
      const invalidDateDto = {
        ...createDto,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-10-31T00:00:00.000Z',
      };

      await expect(service.create(validLandlordId, invalidDateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return list of rentals for user using MongoDbRentalService', async () => {
      const user: JwtPayload = {
        sub: validLandlordId,
        userId: validLandlordId,
        email: 'landlord@example.com',
        role: Role.LANDLORD,
      };

      const paginatedResult = {
        list: [mockRentalDoc],
        page: 1,
        limit: 20,
        total: 1,
        size: 1,
        hasMore: false,
      };
      mockMongoDbRentalService.findUserRentals.mockResolvedValue(paginatedResult);

      const result = await service.findAllForUser(user);

      expect(mockMongoDbRentalService.findUserRentals).toHaveBeenCalledWith(
        validLandlordId,
        'landlord@example.com',
        1,
        20,
      );
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('findByIdWithAuth', () => {
    const user: JwtPayload = {
      sub: validLandlordId,
      userId: validLandlordId,
      email: 'landlord@example.com',
      role: Role.LANDLORD,
    };

    it('should throw BadRequestException if rentalId format is invalid', async () => {
      await expect(service.findByIdWithAuth('invalid-id', user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(null);

      await expect(service.findByIdWithAuth(validRentalId, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized party', async () => {
      const unrelatedUser: JwtPayload = {
        sub: new Types.ObjectId().toString(),
        userId: new Types.ObjectId().toString(),
        email: 'random@example.com',
        role: Role.TENANT,
      };

      mockMongoDbRentalService.findById.mockResolvedValue(mockRentalDoc);

      await expect(service.findByIdWithAuth(validRentalId, unrelatedUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return rental for landlord', async () => {
      mockMongoDbRentalService.findById.mockResolvedValue(mockRentalDoc);

      const result = await service.findByIdWithAuth(validRentalId, user);
      expect(result._id.toString()).toBe(validRentalId);
    });

    it('should return rental for invited tenant matching email', async () => {
      const tenantUser: JwtPayload = {
        sub: validTenantId,
        userId: validTenantId,
        email: 'tenant@example.com',
        role: Role.TENANT,
      };

      mockMongoDbRentalService.findById.mockResolvedValue(mockRentalDoc);

      const result = await service.findByIdWithAuth(validRentalId, tenantUser);
      expect(result._id.toString()).toBe(validRentalId);
    });
  });

  describe('acceptInvite', () => {
    const tenantUser: JwtPayload = {
      sub: validTenantId,
      userId: validTenantId,
      email: 'tenant@example.com',
      role: Role.TENANT,
    };

    it('should throw BadRequestException if id format is invalid', async () => {
      await expect(service.acceptInvite('invalid-id', tenantUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if rental does not exist', async () => {
      mockMongoDbRentalService.findByIdRaw.mockResolvedValue(null);

      await expect(service.acceptInvite(validRentalId, tenantUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if rental is already active', async () => {
      mockMongoDbRentalService.findByIdRaw.mockResolvedValue({
        ...mockRentalDoc,
        status: RentalStatus.ACTIVE,
      });

      await expect(service.acceptInvite(validRentalId, tenantUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if tenant email does not match invite', async () => {
      const otherTenant: JwtPayload = {
        sub: validTenantId,
        userId: validTenantId,
        email: 'other@example.com',
        role: Role.TENANT,
      };

      mockMongoDbRentalService.findByIdRaw.mockResolvedValue({
        ...mockRentalDoc,
        tenantInviteEmail: 'tenant@example.com',
      });

      await expect(service.acceptInvite(validRentalId, otherTenant)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should link tenant and set status to ACTIVE on successful acceptance', async () => {
      const mockDocToUpdate = {
        ...mockRentalDoc,
        save: jest.fn().mockResolvedValue(true),
      };
      mockMongoDbRentalService.findByIdRaw.mockResolvedValue(mockDocToUpdate);

      const result = await service.acceptInvite(validRentalId, tenantUser);

      expect(mockDocToUpdate.tenantId).toEqual(new Types.ObjectId(validTenantId));
      expect(mockDocToUpdate.status).toBe(RentalStatus.ACTIVE);
      expect(mockDocToUpdate.save).toHaveBeenCalled();
      expect(result.message).toBe('Rental invitation accepted');
      expect(result.rentalId).toBe(validRentalId);
    });
  });
});
