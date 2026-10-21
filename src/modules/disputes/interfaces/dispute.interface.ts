import { Types } from 'mongoose';
import { DisputeCategory, DisputeTenantStatus } from '../../../common/enums';
import { IRoomItem } from '../../inspections/interfaces/inspection.interface';
import { IUpload } from '../../upload/interfaces/upload.interface';

export interface IDispute {
  _id: string | Types.ObjectId;
  rentalId: string | Types.ObjectId;
  roomItemId?: string | Types.ObjectId | IRoomItem;
  category: DisputeCategory;
  proposedDeduction: number;
  description: string;
  evidencePhotos: (string | Types.ObjectId | IUpload)[];
  tenantStatus: DisputeTenantStatus;
  tenantComment?: string;
  counterAmount?: number;
  resolved: boolean;
  agreedDeduction?: number;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateDisputeInput {
  rentalId: string;
  category: DisputeCategory;
  proposedDeduction: number;
  description: string;
  roomItemId?: string;
  evidencePhotos?: string[];
}

export interface IRespondDisputeInput {
  tenantStatus: DisputeTenantStatus;
  tenantComment?: string;
  counterAmount?: number;
}

export interface IDisputeSettlementSummary {
  depositAmount: number;
  totalProposedDeductions: number;
  totalAgreedDeductions: number;
  estimatedRefundAmount: number;
  pendingDisputesCount: number;
  resolvedDisputesCount: number;
  totalDisputesCount: number;
}

export interface IDisputeSettlementResponse {
  rentalId: string;
  settlement: IDisputeSettlementSummary;
  disputes: IDispute[];
}
