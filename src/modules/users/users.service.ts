import { Injectable } from '@nestjs/common';
import { MongoDbUserService } from '../../mongoDb/mongo-db-user.service';
import { User, UserDocument } from '../../mongoDb/schema/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { ITenantSummary } from './interfaces/user.interface';

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

  async findTenants(search?: string): Promise<ITenantSummary[]> {
    const tenants = await this.mongoDbUserService.findTenants(search);
    return tenants.map((t) => ({
      _id: (t as any)._id?.toString() || '',
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      role: t.role,
    }));
  }
}
