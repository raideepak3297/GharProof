import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({
  imports: [MongoDbModule],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
