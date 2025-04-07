
import { UserRank } from './index';

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  country: string | null;
  about: string | null;
  role: UserRole;
  rank: UserRank;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'User' | 'Admin' | 'Super Admin' | string;
