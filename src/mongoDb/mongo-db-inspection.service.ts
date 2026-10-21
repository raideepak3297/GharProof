import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InspectionType } from '../common/enums';
import {
  ICreateInspectionInput,
  IInspection,
} from '../modules/inspections/interfaces/inspection.interface';
import { InspectionDocument } from './schema/inspection.schema';
import { INSPECTION_MODEL } from './type/constant';

@Injectable()
export class MongoDbInspectionService {
  constructor(
    @Inject(INSPECTION_MODEL)
    private readonly inspectionModel: Model<InspectionDocument>,
  ) {}

  async create(data: ICreateInspectionInput): Promise<IInspection> {
    const created = await this.inspectionModel.create({
      ...data,
      rentalId: new Types.ObjectId(data.rentalId),
    });
    return created.toObject();
  }

  async findById(id: string): Promise<IInspection | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.inspectionModel
      .findById(id)
      .populate(POPULATE_TAB)
      .lean<IInspection | null>()
      .exec();
  }

  async findByIdRaw(id: string): Promise<InspectionDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.inspectionModel.findById(id).exec();
  }

  async findByRentalAndType(rentalId: string, type: InspectionType): Promise<IInspection | null> {
    if (!Types.ObjectId.isValid(rentalId)) {
      return null;
    }
    return this.inspectionModel
      .findOne({ rentalId: new Types.ObjectId(rentalId), type })
      .populate(POPULATE_TAB)
      .lean<IInspection | null>()
      .exec();
  }

  async findByRental(rentalId: string): Promise<IInspection[]> {
    if (!Types.ObjectId.isValid(rentalId)) {
      return [];
    }
    return this.inspectionModel
      .find({ rentalId: new Types.ObjectId(rentalId) })
      .sort({ createdAt: -1 })
      .populate(POPULATE_TAB)
      .lean<IInspection[]>()
      .exec();
  }

  async update(id: string, updateData: Partial<IInspection>): Promise<IInspection | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.inspectionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate(POPULATE_TAB)
      .lean<IInspection | null>()
      .exec();
  }
}

const POPULATE_TAB = [
  {
    path: 'rentalId',
    select: 'propertyAddress monthlyRent depositAmount status landlordId tenantId',
  },
];
