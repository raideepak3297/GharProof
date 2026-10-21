import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { USER_MODEL } from './type/constant';

@Injectable()
export class MongoDbUserService {
  constructor(
    @Inject(USER_MODEL)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(data);
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async findCleanById(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).select('-passwordHash').lean().exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ email: email.toLowerCase().trim() }).exec();
    return count > 0;
  }
}
