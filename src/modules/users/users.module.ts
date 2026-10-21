import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { UsersService } from './users.service';

@Module({
  imports: [MongoDbModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
