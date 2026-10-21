import { Types } from 'mongoose';
import { InspectionStatus, InspectionType, ItemCondition } from '../../../common/enums';
import { IUpload } from '../../upload/interfaces/upload.interface';

export interface IInspection {
  _id: Types.ObjectId | string;
  rentalId: Types.ObjectId | string;
  type: InspectionType;
  status: InspectionStatus;
  landlordSigned: boolean;
  landlordSignedAt?: Date | null;
  tenantSigned: boolean;
  tenantSignedAt?: Date | null;
  rootHash?: string | null;
  lockedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRoomItem {
  _id: Types.ObjectId | string;
  inspectionId: Types.ObjectId | string;
  roomName: string;
  itemName: string;
  condition: ItemCondition;
  notes?: string;
  photos: (Types.ObjectId | string | IUpload)[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateInspectionInput {
  rentalId: Types.ObjectId | string;
  type: InspectionType;
  status?: InspectionStatus;
  notes?: string;
}

export interface ICreateRoomItemInput {
  inspectionId: Types.ObjectId | string;
  roomName: string;
  itemName: string;
  condition: ItemCondition;
  notes?: string;
  photos?: (Types.ObjectId | string)[];
}

export interface IUpdateRoomItemInput {
  roomName?: string;
  itemName?: string;
  condition?: ItemCondition;
  notes?: string;
  photos?: (Types.ObjectId | string)[];
}

export interface IInspectionDetail extends IInspection {
  items: IRoomItem[];
}
