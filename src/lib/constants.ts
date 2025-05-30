import { BanknoteCondition, UserRank } from '@/types';

// Fix the UserRank point values by using a partial record
export const USER_RANK_POINTS: Partial<Record<UserRank, number>> = {
  'Newbie Collector': 0,
  'Beginner Collector': 1,
  'Mid Collector': 5,
  'Known Collector': 50,
  'Advance Collector': 150,
  'Master Collector': 300,
  'Admin Newbie Collector': -1,
  'Admin Beginner Collector': -1,
  'Admin Mid Collector': -1,
  'Admin Known Collector': -1,
  'Admin Advance Collector': -1,
  'Admin Master Collector': -1,
  'Super Admin Newbie Collector': -1,
  'Super Admin Beginner Collector': -1,
  'Super Admin Mid Collector': -1,
  'Super Admin Known Collector': -1,
  'Super Admin Advance Collector': -1,
  'Super Admin Master Collector': -1
};

// Fix the banknote conditions to match the BanknoteCondition type
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
    rank: 'Admin Newbie Collector',
    points: 9999,
    createdAt: '2022-11-20T10:00:00Z',
    updatedAt: '2023-04-20T16:45:00Z',
  },
];

export const MOCK_BANKNOTES = [
  {
    id: "1",
    catalogId: "P001",
    country: "Ottoman Empire",
    denomination: "5 Kurush",
    year: "1876",
    series: "First Series",
    imageUrls: ["/placeholder.svg"],
    isApproved: true,
    isPending: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "Issued notes",
    category: "Sultan Abdülhamid II",
    sultanName: "Sultan Abdülhamid II",
    extendedPickNumber: "P001",
  },
  {
    id: "2",
    catalogId: "P002",
    country: "Ottoman Empire",
    denomination: "10 Kurush",
    year: "1876",
    series: "First Series",
    imageUrls: ["/placeholder.svg"],
    isApproved: true,
    isPending: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type: "Issued notes",
    category: "Sultan Abdülhamid II",
    sultanName: "Sultan Abdülhamid II",
    extendedPickNumber: "P002",
  }
];

export const DEFAULT_IMAGE_URL = '/placeholder.svg';
