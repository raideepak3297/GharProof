import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { DisputeCategory, DisputeTenantStatus } from '../../common/enums';
import { IDispute } from '../../modules/disputes/interfaces/dispute.interface';

export type DisputeDocument = Dispute & Document;

@Schema({
  timestamps: true,
  collection: 'disputes',
  toJSON: {
    transform: (_doc, ret: any) => {
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    transform: (_doc, ret: any) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Dispute implements IDispute {
  _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Rental',
    required: true,
    index: true,
  })
  rentalId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'RoomItem',
    required: false,
  })
  roomItemId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: DisputeCategory,
    required: true,
  })
  category: DisputeCategory;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  proposedDeduction: number;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  description: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Upload' }],
    default: [],
  })
  evidencePhotos: Types.ObjectId[];

  @Prop({
    type: String,
    enum: DisputeTenantStatus,
    default: DisputeTenantStatus.PENDING,
  })
  tenantStatus: DisputeTenantStatus;

  @Prop({
    type: String,
    trim: true,
  })
  tenantComment?: string;

  @Prop({
    type: Number,
    min: 0,
  })
  counterAmount?: number;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  resolved: boolean;

  @Prop({
    type: Number,
    min: 0,
  })
  agreedDeduction?: number;

  @Prop({
    type: Date,
  })
  resolvedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);

DisputeSchema.index({ rentalId: 1, createdAt: -1 });
DisputeSchema.index({ rentalId: 1, resolved: 1 });
