import { IRentalComparisonResponse } from '../../comparison/interfaces/comparison.interface';
import { IDisputeSettlementResponse } from '../../disputes/interfaces/dispute.interface';
import { IInspection } from '../../inspections/interfaces/inspection.interface';
import { IRental } from '../../rentals/interfaces/rental.interface';

export interface IInspectionReportData {
  rental: IRental;
  moveInInspection: IInspection | null;
  moveOutInspection: IInspection | null;
  comparison: IRentalComparisonResponse;
  settlement: IDisputeSettlementResponse;
}

export interface IGeneratedPdfReport {
  buffer: Buffer;
  filename: string;
}
