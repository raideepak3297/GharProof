import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { RentalStatus } from '../../common/enums';
import { IPropertyAddress } from '../../modules/rentals/interfaces/rental.interface';

export type RentalDocument = Rental & Document;

@Schema({ _id: false })
export class PropertyAddress implements IPropertyAddress {
  @Prop({ required: true, trim: true })
  line1: string;

  @Prop({ required: false, trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ required: true, trim: true })
  state: string;

  @Prop({ required: true, trim: true })
  postalCode: string;
}

const PropertyAddressSchema = SchemaFactory.createForClass(PropertyAddress);

@Schema({
  timestamps: true,
  collection: 'rentals',
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
export class Rental {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  landlordId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
    default: null,
  })
  tenantId?: Types.ObjectId | null;

  @Prop({
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    index: true,
    default: null,
  })
  tenantInviteEmail?: string | null;

  @Prop({ type: String, required: false, trim: true, default: null })
  tenantInvitePhone?: string | null;

  @Prop({ type: PropertyAddressSchema, required: true })
  propertyAddress: PropertyAddress;

  @Prop({ required: true, min: 0 })
  monthlyRent: number;

  @Prop({ required: true, min: 0 })
  depositAmount: number;

  @Prop({
    required: true,
    enum: Object.values(RentalStatus),
    default: RentalStatus.DRAFT,
    index: true,
  })
  status: RentalStatus;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ required: false, type: Date, default: null })
  endDate?: Date | null;
}

export const RentalSchema = SchemaFactory.createForClass(Rental);

RentalSchema.index({ landlordId: 1, status: 1 });
RentalSchema.index({ tenantId: 1, status: 1 });
RentalSchema.index({ tenantInviteEmail: 1, status: 1 });
RentalSchema.index({ landlordId: 1, createdAt: -1 });
RentalSchema.index({ tenantId: 1, createdAt: -1 });
