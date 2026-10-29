import { Role } from '../../../common/enums';

export interface IUser {
  _id?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  role: Role;
}

export interface ITenantSummary {
  _id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  role: Role;
}
