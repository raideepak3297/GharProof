import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { RentalStatus } from '../common/enums';
import { IPaginatedRentalsResponse, IRental } from '../modules/rentals/interfaces/rental.interface';
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

  async findUserRentals(
    userId: string,
    userEmail: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<IPaginatedRentalsResponse> {
    const userObjectId = new Types.ObjectId(userId);
    const filter = {
      $or: [
        { landlordId: userObjectId },
        { tenantId: userObjectId },
        { tenantInviteEmail: userEmail.toLowerCase() },
      ],
    };
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.rentalModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(POPULATE_TAB)
        .lean<IRental[]>()
        .exec(),
      this.rentalModel.countDocuments(filter).exec(),
    ]);

    const hasMore = page * limit < total;

    return {
      list,
      page,
      limit,
      total,
      size: list.length,
      hasMore,
    };
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

  async updateStatus(id: string, status: RentalStatus): Promise<IRental | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.rentalModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate(POPULATE_TAB)
      .lean<IRental | null>()
      .exec();
  }
}

const POPULATE_TAB = [
  { path: 'landlordId', select: 'firstName lastName email phone role' },
  { path: 'tenantId', select: 'firstName lastName email phone role' },
];
