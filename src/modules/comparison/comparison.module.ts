import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { ComparisonController } from './comparison.controller';
import { ComparisonService } from './comparison.service';

@Module({
  imports: [MongoDbModule],
  controllers: [ComparisonController],
  providers: [ComparisonService],
  exports: [ComparisonService],
})
export class ComparisonModule {}
