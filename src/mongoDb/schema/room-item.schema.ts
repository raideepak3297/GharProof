import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ItemCondition } from '../../common/enums';
import { IRoomItem } from '../../modules/inspections/interfaces/inspection.interface';

export type RoomItemDocument = RoomItem & Document;

@Schema({
  timestamps: true,
  collection: 'room_items',
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
export class RoomItem implements IRoomItem {
  _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Inspection',
    required: true,
    index: true,
  })
  inspectionId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  roomName: string;

  @Prop({ required: true, trim: true })
  itemName: string;

  @Prop({
    type: String,
    enum: ItemCondition,
    required: true,
  })
  condition: ItemCondition;

  @Prop({ trim: true })
  notes?: string;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Upload' }],
    default: [],
  })
  photos: Types.ObjectId[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const RoomItemSchema = SchemaFactory.createForClass(RoomItem);

RoomItemSchema.index({ inspectionId: 1, roomName: 1, itemName: 1 });
