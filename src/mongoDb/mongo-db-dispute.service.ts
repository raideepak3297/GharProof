import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ICreateDisputeInput, IDispute } from '../modules/disputes/interfaces/dispute.interface';
import { DisputeDocument } from './schema/dispute.schema';
import { DISPUTE_MODEL } from './type/constant';

@Injectable()
export class MongoDbDisputeService {
  constructor(
    @Inject(DISPUTE_MODEL)
    private readonly disputeModel: Model<DisputeDocument>,
  ) {}

  async create(data: ICreateDisputeInput): Promise<IDispute> {
    const photoObjectIds = (data.evidencePhotos || [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const payload: any = {
      rentalId: new Types.ObjectId(data.rentalId),
      category: data.category,
      proposedDeduction: data.proposedDeduction,
      description: data.description.trim(),
      evidencePhotos: photoObjectIds,
    };

    if (data.roomItemId && Types.ObjectId.isValid(data.roomItemId)) {
      payload.roomItemId = new Types.ObjectId(data.roomItemId);
    }

    const created = await this.disputeModel.create(payload);
    const populated = await created.populate(POPULATE_TAB);
    return populated.toObject();
  }

  async findById(id: string): Promise<IDispute | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.disputeModel.findById(id).populate(POPULATE_TAB).lean<IDispute | null>().exec();
  }

  async findByRentalId(rentalId: string): Promise<IDispute[]> {
    if (!Types.ObjectId.isValid(rentalId)) {
      return [];
    }
    return this.disputeModel
      .find({ rentalId: new Types.ObjectId(rentalId) })
      .sort({ createdAt: -1 })
      .populate(POPULATE_TAB)
      .lean<IDispute[]>()
      .exec();
  }

  async update(id: string, updateData: Partial<IDispute>): Promise<IDispute | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const payload: Record<string, unknown> = {};
    if (updateData.tenantStatus !== undefined) payload.tenantStatus = updateData.tenantStatus;
    if (updateData.tenantComment !== undefined)
      payload.tenantComment = updateData.tenantComment.trim();
    if (updateData.counterAmount !== undefined) payload.counterAmount = updateData.counterAmount;
    if (updateData.resolved !== undefined) payload.resolved = updateData.resolved;
    if (updateData.agreedDeduction !== undefined)
      payload.agreedDeduction = updateData.agreedDeduction;
    if (updateData.resolvedAt !== undefined) payload.resolvedAt = updateData.resolvedAt;

    return this.disputeModel
      .findByIdAndUpdate(id, payload, { new: true })
      .populate(POPULATE_TAB)
      .lean<IDispute | null>()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.disputeModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

const POPULATE_TAB = [
  {
    path: 'evidencePhotos',
    select: 'originalName fileName mimeType size path sha256Hash createdAt',
  },
  {
    path: 'roomItemId',
    select: 'roomName itemName condition notes photos',
  },
];
