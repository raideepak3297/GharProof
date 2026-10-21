import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { RentalInspectionsController } from './rental-inspections.controller';

@Module({
  imports: [MongoDbModule],
  controllers: [InspectionsController, RentalInspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
