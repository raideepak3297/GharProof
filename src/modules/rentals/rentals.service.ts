import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RentalStatus, Role } from '../../common/enums';
import { assertRentalAccess } from '../../common/utils/rental-access.util';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbUserService } from '../../mongoDb/mongo-db-user.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ListRentalsDto } from './dto/list-rentals.dto';
import { IPaginatedRentalsResponse, IRental } from './interfaces/rental.interface';

@Injectable()
export class RentalsService {
  constructor(
    private readonly mongoDbRentalService: MongoDbRentalService,
    private readonly mongoDbUserService: MongoDbUserService,
  ) {}

  async create(landlordId: string, createRentalDto: CreateRentalDto): Promise<IRental> {
    if (createRentalDto.endDate) {
      const start = new Date(createRentalDto.startDate);
      const end = new Date(createRentalDto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    let tenantObjectId: Types.ObjectId | null = null;
    let inviteEmail = createRentalDto.tenantInviteEmail?.toLowerCase()?.trim();
    let invitePhone = createRentalDto.tenantInvitePhone?.trim();

    if (createRentalDto.tenantId) {
      if (!Types.ObjectId.isValid(createRentalDto.tenantId)) {
        throw new BadRequestException('Invalid tenant ID format');
      }
      const tenant = await this.mongoDbUserService.findById(createRentalDto.tenantId);
      if (!tenant || tenant.role !== Role.TENANT) {
        throw new BadRequestException('Selected user is not a valid registered tenant');
      }
      tenantObjectId = new Types.ObjectId(createRentalDto.tenantId);
      inviteEmail = tenant.email;
      invitePhone = tenant.phone || invitePhone;
    } else if (inviteEmail) {
      const existingTenant = await this.mongoDbUserService.findByEmail(inviteEmail);
      if (existingTenant && existingTenant.role === Role.TENANT) {
        tenantObjectId = existingTenant._id;
        invitePhone = existingTenant.phone || invitePhone;
      }
    }

    const status = tenantObjectId || inviteEmail ? RentalStatus.INVITED : RentalStatus.DRAFT;

    return this.mongoDbRentalService.create({
      ...createRentalDto,
      tenantId: tenantObjectId,
      tenantInviteEmail: inviteEmail,
      tenantInvitePhone: invitePhone,
      landlordId: new Types.ObjectId(landlordId),
      status,
      startDate: new Date(createRentalDto.startDate),
      endDate: createRentalDto.endDate ? new Date(createRentalDto.endDate) : null,
    });
  }

  async findAllForUser(
    user: JwtPayload,
    query?: ListRentalsDto,
  ): Promise<IPaginatedRentalsResponse> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    return this.mongoDbRentalService.findUserRentals(user.userId, user.email, page, limit);
  }

  async findByIdWithAuth(rentalId: string, user: JwtPayload): Promise<IRental> {
    if (!Types.ObjectId.isValid(rentalId)) {
      throw new BadRequestException('Invalid rental ID format');
    }

    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    assertRentalAccess(rental, user, 'this rental');

    return rental;
  }

  async acceptInvite(
    rentalId: string,
    user: JwtPayload,
  ): Promise<{ message: string; rentalId: string }> {
    if (!Types.ObjectId.isValid(rentalId)) {
      throw new BadRequestException('Invalid rental ID format');
    }

    const rental = await this.mongoDbRentalService.findByIdRaw(rentalId);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.status === RentalStatus.ACTIVE) {
      throw new BadRequestException('Rental invitation has already been accepted');
    }

    if (rental.status === RentalStatus.COMPLETED) {
      throw new BadRequestException('Rental agreement is already completed');
    }

    if (
      !rental.tenantInviteEmail ||
      rental.tenantInviteEmail.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new ForbiddenException('You are not the invited tenant for this rental');
    }

    rental.tenantId = new Types.ObjectId(user.userId);
    rental.status = RentalStatus.ACTIVE;
    await rental.save();

    return {
      message: 'Rental invitation accepted',
      rentalId: rental._id.toString(),
    };
  }
}
