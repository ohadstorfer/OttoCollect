import { BanknoteCondition, UserRank } from '@/types';

// Fix the UserRank point values by using a partial record
export const USER_RANK_POINTS: Partial<Record<UserRank, number>> = {
  'Newbie': 0,
  'Beginner Collector': 100,
  'Casual Collector': 500,
  'Known Collector': 1000,
  'Advance Collector': 2000,
  'Expert': 5000,
  'Master': 10000,
  'Admin': -1,
  'Super Admin': -1
};

// Fix the banknote conditions
export const BANKNOTE_CONDITIONS: Record<BanknoteCondition, string> = {
  'UNC': 'Uncirculated',
  'AU': 'About Uncirculated',
  'XF': 'Extremely Fine',
  'VF': 'Very Fine',
  'F': 'Fine',
  'VG': 'Very Good',
  'G': 'Good',
  'Fair': 'Fair',
  'Poor': 'Poor'
};

export const MOCK_USERS = [
  {
    id: 'user-1',
    username: 'collector123',
    email: 'collector123@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    about: 'Passionate about collecting rare banknotes from around the world.',
    country: 'USA',
    role: 'User',
    rank: 'Known Collector',
    points: 1250,
    createdAt: '2023-01-15T12:00:00Z',
    updatedAt: '2023-03-10T14:30:00Z',
  },
  {
    id: 'user-2',
    username: 'banknoteFan',
    email: 'banknoteFan@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    about: 'Just starting my journey into the world of banknote collecting!',
    country: 'Canada',
    role: 'User',
    rank: 'Beginner Collector',
    points: 150,
    createdAt: '2023-02-01T08:00:00Z',
    updatedAt: '2023-04-05T10:15:00Z',
  },
  {
    id: 'user-3',
    username: 'adminUser',
    email: 'adminUser@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    about: 'Administering the banknote collecting platform.',
    country: 'UK',
    role: 'Admin',
    rank: 'Admin',
    points: 9999,
    createdAt: '2022-11-20T10:00:00Z',
    updatedAt: '2023-04-20T16:45:00Z',
  },
];

export const DEFAULT_IMAGE_URL = '/placeholder.svg';
