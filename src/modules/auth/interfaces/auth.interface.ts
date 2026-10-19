import { Role } from '../../../common/enums';
import { IUserProfile } from '../../users/interfaces/user.interface';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: IUserProfile;
}
