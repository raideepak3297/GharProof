import { ComparisonDiffStatus, ItemCondition } from '../../../common/enums';
import { IUpload } from '../../upload/interfaces/upload.interface';

export interface IInspectionItemSnapshot {
  _id?: string;
  condition: ItemCondition;
  notes?: string;
  photos: (IUpload | string)[];
}

export interface IItemComparison {
  roomName: string;
  itemName: string;
  diffStatus: ComparisonDiffStatus;
  moveIn?: IInspectionItemSnapshot | null;
  moveOut?: IInspectionItemSnapshot | null;
}

export interface IComparisonSummary {
  totalItems: number;
  unchangedCount: number;
  minorWearCount: number;
  damagedCount: number;
  missingCount: number;
  addedCount: number;
}

export interface IRentalComparisonResponse {
  rentalId: string;
  moveInInspectionId?: string | null;
  moveInLocked: boolean;
  moveOutInspectionId?: string | null;
  moveOutLocked: boolean;
  summary: IComparisonSummary;
  comparisons: IItemComparison[];
}
