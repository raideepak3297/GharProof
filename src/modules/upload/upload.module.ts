import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [MongoDbModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
