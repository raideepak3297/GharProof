import { Module } from '@nestjs/common';
import { MongoDbModule } from '../../mongoDb/mongo-db.module';
import { ComparisonModule } from '../comparison/comparison.module';
import { DisputesModule } from '../disputes/disputes.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfReportBuilder } from './pdf-report.builder';

@Module({
  imports: [MongoDbModule, ComparisonModule, DisputesModule],
  controllers: [ReportsController],
  providers: [ReportsService, PdfReportBuilder],
  exports: [ReportsService, PdfReportBuilder],
})
export class ReportsModule {}
