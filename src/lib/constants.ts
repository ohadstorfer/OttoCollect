
import { BanknoteCondition, UserRank, UserRole } from "@/types";

// User Ranks and Points Thresholds
export const USER_RANK_POINTS: Record<UserRank, number> = {
  'Newbie': 0,
  'Beginner': 50,
  'Mid Collector': 200,
  'Known Collector': 500,
  'Advance Collector': 1000,
  'Admin Newbie': 0,
  'Admin Beginner': 50,
  'Admin Mid Collector': 200,
  'Admin Known Collector': 500,
  'Admin Advance Collector': 1000,
  'Super Admin Newbie': 0,
  'Super Admin Beginner': 50,
  'Super Admin Mid Collector': 200,
  'Super Admin Known Collector': 500,
  'Super Admin Advance Collector': 1000,
};

// Points for various actions
export const ACTION_POINTS = {
  ADD_COLLECTION_ITEM: 5,
  IMAGE_APPROVED_FOR_CATALOG: 20,
  FORUM_POST: 2,
  FORUM_THREAD: 5,
  BLOG_POST: 15,
  MARKETPLACE_LISTING: 3
};

// Ottoman Empire countries/regions for catalog organization
export const OTTOMAN_REGIONS = [
  'Turkey',
  'Egypt',
  'Syria',
  'Iraq',
  'Lebanon',
  'Palestine',
  'Jordan',
  'Saudi Arabia',
  'Yemen',
  'Libya',
  'Tunisia',
  'Algeria',
  'Morocco',
  'Sudan',
  'Greece',
  'Bulgaria',
  'Romania',
  'Hungary',
  'Serbia',
  'Bosnia',
  'Albania',
  'North Macedonia',
  'Montenegro',
  'Kosovo'
];

// Banknote condition descriptions for tooltips and guidance
export const CONDITION_DESCRIPTIONS: Record<BanknoteCondition, string> = {
  'UNC': 'Uncirculated - No wear, original luster, no folds',
  'AU': 'About Uncirculated - Slight wear, may have one light fold',
  'XF': 'Extremely Fine - Minor circulation, minimal wear, some folds',
  'VF': 'Very Fine - Some circulation, light wear, multiple folds',
  'F': 'Fine - Moderate wear, soiling possible, multiple folds',
  'VG': 'Very Good - Significant wear, may have tears or stains',
  'G': 'Good - Heavy circulation, soiled, may have tears',
  'Fair': 'Fair - Heavily worn, tears, stains, pieces missing',
  'Poor': 'Poor - Extremely worn, damaged, tears, heavy soiling'
};

// Mock data for development
export const MOCK_USERS = [
  {
    id: '1',
    username: 'ottomanCollector',
    email: 'collector@example.com',
    role: 'User' as UserRole,
    rank: 'Known Collector' as UserRank,
    points: 567,
    createdAt: '2023-01-15T10:30:00Z',
    avatarUrl: '/placeholder.svg'
  },
  {
    id: '2',
    username: 'turkeyAdmin',
    email: 'admin@example.com',
    role: 'Admin' as UserRole,
    rank: 'Admin Advance Collector' as UserRank,
    points: 1230,
    country: 'Turkey',
    createdAt: '2022-11-03T08:15:00Z',
    avatarUrl: '/placeholder.svg'
  },
  {
    id: '3',
    username: 'superAdmin',
    email: 'superadmin@example.com',
    role: 'SuperAdmin' as UserRole,
    rank: 'Super Admin Known Collector' as UserRank,
    points: 789,
    createdAt: '2022-10-01T12:00:00Z',
    avatarUrl: '/placeholder.svg'
  }
];

export const MOCK_BANKNOTES = [
  {
    id: '1',
    catalogId: 'TR-1890-001',
    country: 'Turkey',
    denomination: '5 Kurush',
    year: '1890',
    series: 'Imperial Ottoman Bank',
    description: 'Ottoman Empire 5 Kurush banknote from the late 19th century',
    obverseDescription: 'Imperial Ottoman Bank logo with Arabic text',
    reverseDescription: 'Value in multiple languages and ornamental border',
    imageUrls: ['/placeholder.svg'],
    isApproved: true,
    isPending: false,
    createdAt: '2023-01-10T10:00:00Z',
    updatedAt: '2023-01-10T10:00:00Z',
    createdBy: '2'
  },
  {
    id: '2',
    catalogId: 'EG-1916-005',
    country: 'Egypt',
    denomination: '50 Piastres',
    year: '1916',
    series: 'National Bank of Egypt',
    description: 'Egyptian 50 Piastres note under Ottoman influence',
    obverseDescription: 'Sphinx and pyramid design with Arabic text',
    reverseDescription: 'Value in Arabic and English with geometric pattern',
    imageUrls: ['/placeholder.svg'],
    isApproved: true,
    isPending: false,
    createdAt: '2023-01-12T14:30:00Z',
    updatedAt: '2023-01-12T14:30:00Z',
    createdBy: '2'
  },
  {
    id: '3',
    catalogId: 'SY-1915-010',
    country: 'Syria',
    denomination: '10 Lira',
    year: '1915',
    series: 'Ottoman Empire Provincial Issue',
    description: 'Syrian 10 Lira note from late Ottoman period',
    obverseDescription: 'Ottoman Tughra with regional emblems',
    reverseDescription: 'Ornate floral design with value in Arabic and French',
    imageUrls: ['/placeholder.svg'],
    isApproved: true,
    isPending: false,
    createdAt: '2023-01-15T09:45:00Z',
    updatedAt: '2023-01-15T09:45:00Z',
    createdBy: '3'
  },
  {
    id: '4',
    catalogId: 'TR-1912-100',
    country: 'Turkey',
    denomination: '100 Lira',
    year: '1912',
    series: 'Late Ottoman Period',
    description: 'High value Turkish note from before World War I',
    obverseDescription: 'Imperial seal with calligraphic text',
    reverseDescription: 'View of Constantinople with ornate border',
    imageUrls: ['/placeholder.svg'],
    isApproved: false,
    isPending: true,
    createdAt: '2023-02-01T11:20:00Z',
    updatedAt: '2023-02-01T11:20:00Z',
    createdBy: '1'
  }
];

export const MOCK_COLLECTION_ITEMS = [
  {
    id: '1',
    userId: '1',
    banknoteId: '1',
    banknote: MOCK_BANKNOTES[0],
    condition: 'VF' as BanknoteCondition,
    salePrice: 120,
    isForSale: true,
    publicNote: 'Rare early issue with clear watermark',
    privateNote: 'Purchased at Istanbul auction',
    purchasePrice: 85,
    purchaseDate: '2022-06-15T00:00:00Z',
    location: 'Safe deposit box',
    personalImages: ['/placeholder.svg'],
    orderIndex: 1,
    createdAt: '2022-06-16T15:30:00Z',
    updatedAt: '2022-12-01T08:45:00Z'
  },
  {
    id: '2',
    userId: '1',
    banknoteId: '2',
    banknote: MOCK_BANKNOTES[1],
    condition: 'AU' as BanknoteCondition,
    salePrice: null,
    isForSale: false,
    publicNote: '',
    privateNote: 'Gift from grandfather\'s collection',
    purchaseDate: '2021-10-10T00:00:00Z',
    location: 'Album 2, page 5',
    personalImages: ['/placeholder.svg'],
    orderIndex: 2,
    createdAt: '2021-10-12T09:15:00Z',
    updatedAt: '2021-10-12T09:15:00Z'
  },
  {
    id: '3',
    userId: '2',
    banknoteId: '3',
    banknote: MOCK_BANKNOTES[2],
    condition: 'XF' as BanknoteCondition,
    salePrice: 350,
    isForSale: true,
    publicNote: 'Exceptional example with vivid colors',
    purchasePrice: 200,
    purchaseDate: '2022-03-21T00:00:00Z',
    location: 'Display frame',
    personalImages: ['/placeholder.svg'],
    orderIndex: 1,
    createdAt: '2022-03-22T14:00:00Z',
    updatedAt: '2023-01-05T16:25:00Z'
  }
];

export const MOCK_MARKETPLACE_ITEMS = [
  {
    id: '1',
    collectionItemId: '1',
    collectionItem: MOCK_COLLECTION_ITEMS[0],
    sellerId: '1',
    seller: {
      id: '1',
      username: 'ottomanCollector',
      rank: 'Known Collector' as UserRank
    },
    status: 'Available' as const,
    createdAt: '2022-12-01T08:45:00Z',
    updatedAt: '2022-12-01T08:45:00Z'
  },
  {
    id: '2',
    collectionItemId: '3',
    collectionItem: MOCK_COLLECTION_ITEMS[2],
    sellerId: '2',
    seller: {
      id: '2',
      username: 'turkeyAdmin',
      rank: 'Admin Advance Collector' as UserRank
    },
    status: 'Available' as const,
    createdAt: '2023-01-05T16:25:00Z',
    updatedAt: '2023-01-05T16:25:00Z'
  }
];

export const MOCK_FORUM_THREADS = [
  {
    id: '1',
    title: 'Looking for 1880s Ottoman banknotes',
    content: 'I\'m trying to complete my collection of 1880s Imperial Ottoman Bank issues. Does anyone have extras for trade or sale?',
    authorId: '1',
    author: {
      id: '1',
      username: 'ottomanCollector',
      rank: 'Known Collector' as UserRank
    },
    replies: [
      {
        id: '1',
        threadId: '1',
        content: 'I have some duplicates from that period. Send me a message and we can discuss.',
        authorId: '2',
        author: {
          id: '2',
          username: 'turkeyAdmin',
          rank: 'Admin Advance Collector' as UserRank
        },
        createdAt: '2023-02-05T09:45:00Z',
        updatedAt: '2023-02-05T09:45:00Z'
      }
    ],
    createdAt: '2023-02-05T08:30:00Z',
    updatedAt: '2023-02-05T08:30:00Z'
  },
  {
    id: '2',
    title: 'Authenticating Syrian Ottoman notes',
    content: 'What features should I look for to authenticate Syrian Ottoman provincial notes from 1915-1918?',
    authorId: '2',
    author: {
      id: '2',
      username: 'turkeyAdmin',
      rank: 'Admin Advance Collector' as UserRank
    },
    replies: [],
    createdAt: '2023-02-10T14:15:00Z',
    updatedAt: '2023-02-10T14:15:00Z'
  }
];

export const MOCK_BLOG_POSTS = [
  {
    id: '1',
    title: 'The History of Ottoman Imperial Bank Notes',
    content: 'The Ottoman Imperial Bank was founded in 1856 as a joint venture between British, French and Turkish interests. It was granted the exclusive privilege to issue banknotes in the Ottoman Empire...',
    excerpt: 'Explore the fascinating history of the Ottoman Imperial Bank and its role in issuing the empire\'s currency.',
    mainImageUrl: '/placeholder.svg',
    authorId: '2',
    author: {
      id: '2',
      username: 'turkeyAdmin',
      rank: 'Admin Advance Collector' as UserRank
    },
    createdAt: '2023-01-20T10:00:00Z',
    updatedAt: '2023-01-20T10:00:00Z'
  },
  {
    id: '2',
    title: 'Identifying Watermarks in Late Ottoman Notes',
    content: 'Watermarks are one of the most important security features in Ottoman banknotes. This guide explains how to identify genuine watermarks...',
    excerpt: 'Learn how to authenticate Ottoman banknotes by identifying genuine watermarks and other security features.',
    mainImageUrl: '/placeholder.svg',
    authorId: '3',
    author: {
      id: '3',
      username: 'superAdmin',
      rank: 'Super Admin Known Collector' as UserRank
    },
    createdAt: '2023-02-15T16:30:00Z',
    updatedAt: '2023-02-15T16:30:00Z'
  }
];
