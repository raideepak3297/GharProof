import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RentalStatus } from '../../common/enums';
import { assertRentalAccess } from '../../common/utils/rental-access.util';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateRentalDto } from './dto/create-rental.dto';
import { IRental } from './interfaces/rental.interface';

@Injectable()
export class RentalsService {
  constructor(private readonly mongoDbRentalService: MongoDbRentalService) {}

  async create(landlordId: string, createRentalDto: CreateRentalDto): Promise<IRental> {
    if (createRentalDto.endDate) {
      const start = new Date(createRentalDto.startDate);
      const end = new Date(createRentalDto.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const status = createRentalDto.tenantInviteEmail ? RentalStatus.INVITED : RentalStatus.DRAFT;

    return this.mongoDbRentalService.create({
      ...createRentalDto,
      tenantInviteEmail: createRentalDto.tenantInviteEmail?.toLowerCase(),
      landlordId: new Types.ObjectId(landlordId),
      status,
      startDate: new Date(createRentalDto.startDate),
      endDate: createRentalDto.endDate ? new Date(createRentalDto.endDate) : null,
    });
  }

  async findAllForUser(user: JwtPayload): Promise<IRental[]> {
    return this.mongoDbRentalService.findUserRentals(user.userId, user.email);
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
