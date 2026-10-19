import { Role } from '../../../common/enums';
import { IUserProfile } from '../../users/interfaces/user.interface';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  sub?: string;
}

export type AuthenticatedUser = JwtPayload;

export interface AuthResponse {
  accessToken: string;
  user: IUserProfile;
}
