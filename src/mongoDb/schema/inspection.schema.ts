import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { InspectionStatus, InspectionType } from '../../common/enums';
import { IInspection } from '../../modules/inspections/interfaces/inspection.interface';

export type InspectionDocument = Inspection & Document;

@Schema({
  timestamps: true,
  collection: 'inspections',
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
export class Inspection implements IInspection {
  _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Rental',
    required: true,
    index: true,
  })
  rentalId: Types.ObjectId;

  @Prop({
    type: String,
    enum: InspectionType,
    required: true,
  })
  type: InspectionType;

  @Prop({
    type: String,
    enum: InspectionStatus,
    default: InspectionStatus.DRAFT,
    index: true,
  })
  status: InspectionStatus;

  @Prop({ default: false })
  landlordSigned: boolean;

  @Prop({ type: Date, default: null })
  landlordSignedAt?: Date | null;

  @Prop({ default: false })
  tenantSigned: boolean;

  @Prop({ type: Date, default: null })
  tenantSignedAt?: Date | null;

  @Prop({ type: String, default: null, trim: true })
  rootHash?: string | null;

  @Prop({ type: Date, default: null })
  lockedAt?: Date | null;

  @Prop({ trim: true })
  notes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InspectionSchema = SchemaFactory.createForClass(Inspection);

// One inspection of each type per rental (e.g. only 1 move-in and 1 move-out per rental)
InspectionSchema.index({ rentalId: 1, type: 1 }, { unique: true });
