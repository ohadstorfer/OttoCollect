export type UserRole = 'User' | 'Admin' | 'SuperAdmin';

export type UserRank = 
  | 'Newbie' 
  | 'Beginner' 
  | 'Mid Collector' 
  | 'Known Collector' 
  | 'Advance Collector'
  | 'Admin Newbie'
  | 'Admin Beginner'
  | 'Admin Mid Collector'
  | 'Admin Known Collector'
  | 'Admin Advance Collector'
  | 'Super Admin Newbie'
  | 'Super Admin Beginner'
  | 'Super Admin Mid Collector'
  | 'Super Admin Known Collector'
  | 'Super Admin Advance Collector';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  rank: UserRank;
  points: number;
  country?: string;  // Keep this as optional
  createdAt: string;
  avatarUrl?: string;
  about?: string;    // Add about field for user bio
}

export type BanknoteCondition = 
  | 'UNC' 
  | 'AU' 
  | 'XF' 
  | 'VF' 
  | 'F' 
  | 'VG' 
  | 'G' 
  | 'Fair' 
  | 'Poor';

export interface Banknote {
  id: string;
  catalogId: string;
  country: string;
  denomination: string;
  year: string;
  series?: string;
  description: string;
  obverseDescription?: string;
  reverseDescription?: string;
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DetailedBanknote {
  id: string;
  country: string;
  extended_pick_number: string;
  pick_number: string;
  turk_catalog_number?: string;
  face_value: string;
  islamic_year?: string;
  gregorian_year?: string;
  signatures_front?: string;
  signatures_back?: string;
  signature_pictures?: string[];
  seal_names?: string;
  seal_pictures?: string[];
  watermark_picture?: string;
  other_element_pictures?: string[];
  front_picture?: string;
  back_picture?: string;
  sultan_name?: string;
  tughra_picture?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  security_element?: string;
  colors?: string;
  serial_numbering?: string;
  banknote_description?: string;
  historical_description?: string;
  is_approved: boolean;
  is_pending: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: Banknote;
  condition: BanknoteCondition;
  salePrice: number | null;
  isForSale: boolean;
  publicNote?: string;
  privateNote?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  location?: string;
  personalImages?: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: Banknote;
  priority: 'Low' | 'Medium' | 'High';
  note?: string;
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  collectionItemId: string;
  collectionItem: CollectionItem;
  sellerId: string;
  seller: {
    id: string;
    username: string;
    rank: UserRank;
  };
  status: 'Available' | 'Reserved' | 'Sold';
  createdAt: string;
  updatedAt: string;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    rank: UserRank;
  };
  replies: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  id: string;
  threadId: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    rank: UserRank;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  mainImageUrl: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    rank: UserRank;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  referenceItemId?: string; // For marketplace inquiries
  isRead: boolean;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  criteria: string;
  isAutomaticAward: boolean;
  createdAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  badge: Badge;
  awardedAt: string;
}

export interface Translation {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  translatedAt: string;
}
