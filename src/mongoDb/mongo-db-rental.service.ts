import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { IRental } from '../modules/rentals/interfaces/rental.interface';
import { RentalDocument } from './schema/rental.schema';
import { RENTAL_MODEL } from './type/constant';

@Injectable()
export class MongoDbRentalService {
  constructor(
    @Inject(RENTAL_MODEL)
    private readonly rentalModel: Model<RentalDocument>,
  ) {}

  async create(data: Record<string, unknown>): Promise<IRental> {
    const created = await this.rentalModel.create(data);
    return created.toObject();
  }

  async findUserRentals(userId: string, userEmail: string): Promise<IRental[]> {
    const userObjectId = new Types.ObjectId(userId);
    const filter = {
      $or: [
        { landlordId: userObjectId },
        { tenantId: userObjectId },
        { tenantInviteEmail: userEmail.toLowerCase() },
      ],
    };

    return this.rentalModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(POPULATE_TAB)
      .lean<IRental[]>()
      .exec();
  }

  async findById(id: string): Promise<IRental | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.rentalModel.findById(id).populate(POPULATE_TAB).lean<IRental | null>().exec();
  }

  async findByIdRaw(id: string): Promise<RentalDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.rentalModel.findById(id).exec();
  }
}

const POPULATE_TAB = [
  { path: 'landlordId', select: 'name email phone role' },
  { path: 'tenantId', select: 'name email phone role' },
];
