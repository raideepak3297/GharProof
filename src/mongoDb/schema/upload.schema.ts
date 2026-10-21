import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { IUpload } from '../../modules/upload/interfaces/upload.interface';

export type UploadDocument = Upload & Document;

@Schema({
  timestamps: true,
  collection: 'uploads',
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
export class Upload implements IUpload {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  originalName: string;

  @Prop({ required: true, trim: true })
  fileName: string;

  @Prop({ required: true, trim: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, trim: true })
  path: string;

  @Prop({ required: true, trim: true, index: true })
  sha256Hash: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  uploadedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);

// Compound index for querying user uploads by recency
UploadSchema.index({ uploadedBy: 1, createdAt: -1 });
