import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { ICreateUploadInput, IUpload } from '../modules/upload/interfaces/upload.interface';
import { UploadDocument } from './schema/upload.schema';
import { UPLOAD_MODEL } from './type/constant';

@Injectable()
export class MongoDbUploadService {
  constructor(
    @Inject(UPLOAD_MODEL)
    private readonly uploadModel: Model<UploadDocument>,
  ) {}

  async create(data: ICreateUploadInput): Promise<IUpload> {
    const created = await this.uploadModel.create(data);
    return created.toObject();
  }

  async findById(id: string): Promise<IUpload | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.uploadModel.findById(id).populate(POPULATE_TAB).lean<IUpload | null>().exec();
  }

  async findByIdRaw(id: string): Promise<UploadDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.uploadModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<IUpload[]> {
    const validIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (validIds.length === 0) {
      return [];
    }
    return this.uploadModel
      .find({ _id: { $in: validIds } })
      .populate(POPULATE_TAB)
      .lean<IUpload[]>()
      .exec();
  }

  async findByHash(hash: string): Promise<IUpload | null> {
    return this.uploadModel
      .findOne({ sha256Hash: hash.toLowerCase().trim() })
      .populate(POPULATE_TAB)
      .lean<IUpload | null>()
      .exec();
  }

  async findUserUploads(userId: string): Promise<IUpload[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }
    return this.uploadModel
      .find({ uploadedBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean<IUpload[]>()
      .exec();
  }
}

const POPULATE_TAB = [{ path: 'uploadedBy', select: 'name email role' }];
