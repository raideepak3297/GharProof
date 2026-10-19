import { Role } from '../../../common/enums';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}
