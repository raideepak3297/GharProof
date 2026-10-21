import { Types } from 'mongoose';

export interface IUpload {
  _id: Types.ObjectId | string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  sha256Hash: string;
  uploadedBy: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateUploadInput {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  sha256Hash: string;
  uploadedBy: string | Types.ObjectId;
}

export interface IUploadResponse {
  _id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  sha256Hash: string;
  createdAt?: Date;
}
