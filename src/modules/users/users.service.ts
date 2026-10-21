import { Injectable } from '@nestjs/common';
import { MongoDbUserService } from '../../mongoDb/mongo-db-user.service';
import { User, UserDocument } from '../../mongoDb/schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly mongoDbUserService: MongoDbUserService) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    return this.mongoDbUserService.create(createUserDto);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.mongoDbUserService.findByEmail(email);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.mongoDbUserService.findById(id);
  }

  async findCleanById(id: string): Promise<User | null> {
    return this.mongoDbUserService.findCleanById(id);
  }
}
