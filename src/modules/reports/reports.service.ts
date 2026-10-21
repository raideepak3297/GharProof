import { Injectable, NotFoundException } from '@nestjs/common';
import { InspectionType } from '../../common/enums';
import { assertRentalAccess } from '../../common/utils/rental-access.util';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ComparisonService } from '../comparison/comparison.service';
import { DisputesService } from '../disputes/disputes.service';
import { IGeneratedPdfReport, IInspectionReportData } from './interfaces/report.interface';
import { PdfReportBuilder } from './pdf-report.builder';

@Injectable()
export class ReportsService {
  constructor(
    private readonly mongoDbRentalService: MongoDbRentalService,
    private readonly mongoDbInspectionService: MongoDbInspectionService,
    private readonly comparisonService: ComparisonService,
    private readonly disputesService: DisputesService,
    private readonly pdfReportBuilder: PdfReportBuilder,
  ) {}

  async generateReport(rentalId: string, user: JwtPayload): Promise<IGeneratedPdfReport> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    assertRentalAccess(rental, user, 'reports for this rental');

    const [moveInInspection, moveOutInspection, comparison, settlementResponse] = await Promise.all(
      [
        this.mongoDbInspectionService.findByRentalAndType(rentalId, InspectionType.MOVE_IN),
        this.mongoDbInspectionService.findByRentalAndType(rentalId, InspectionType.MOVE_OUT),
        this.comparisonService.getComparison(rentalId, user),
        this.disputesService.getSettlementSummary(rentalId, user),
      ],
    );

    const reportData: IInspectionReportData = {
      rental,
      moveInInspection,
      moveOutInspection,
      comparison,
      settlement: settlementResponse,
    };

    const buffer = await this.pdfReportBuilder.buildPdfBuffer(reportData);
    const filename = `GharProof-Inspection-Report-${rentalId}.pdf`;

    return { buffer, filename };
  }
}
