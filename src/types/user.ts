
import { UserRank, UserRole } from './index';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  about?: string;
  country?: string;
  role_id?: string;
  role: UserRole;
  rank: UserRank;
  points: number;
  createdAt: string;
  updatedAt?: string;
}
