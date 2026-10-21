import { Types } from 'mongoose';
import { RentalStatus } from '../../../common/enums';

export interface IPropertyAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface IRental {
  _id: Types.ObjectId | string;
  landlordId: Types.ObjectId | string;
  tenantId?: Types.ObjectId | string;
  tenantInviteEmail?: string;
  tenantInvitePhone?: string;
  propertyAddress: IPropertyAddress;
  monthlyRent: number;
  depositAmount: number;
  status: RentalStatus;
  startDate: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateRentalInput {
  propertyAddress: IPropertyAddress;
  monthlyRent: number;
  depositAmount: number;
  startDate: Date | string;
  endDate?: Date | string;
  tenantInviteEmail?: string;
  tenantInvitePhone?: string;
}

export interface IUpdateRentalInput {
  propertyAddress?: Partial<IPropertyAddress>;
  monthlyRent?: number;
  depositAmount?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  tenantInviteEmail?: string;
  tenantInvitePhone?: string;
}

export interface IRentalDetailResponse extends IRental {
  moveInInspection?: Record<string, unknown> | null;
  moveOutInspection?: Record<string, unknown> | null;
}
