export interface DetailedBanknote {
  id: string;
  extendedPickNumber: string;
  country: string;
  faceValue: string;
  frontPicture: string | null;
  backPicture: string | null;
  category: string | null;
  type: string | null;
  printer: string | null;
  colors: string | null;
  signaturesFront: string | null;
  signaturesBack: string | null;
  sultanName: string | null;
  gregorianYear: string | null;
  islamicYear: string | null;
  pickNumber: string;
  turkCatalogNumber: string | null;
  rarity: string | null;
  securityElement: string | null;
  watermarkPicture: string | null;
  sealPictures: string[] | null;
  signaturePictures: string[] | null;
  otherElementPictures: string[] | null;
  sealNames: string | null;
  banknoteDescription: string | null;
  historicalDescription: string | null;
  isApproved: boolean | null;
  isPending: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  // Properties mapped from Banknote interface for compatibility
  catalogId?: string;
  denomination?: string;
  year?: string;
  series?: string;
  imageUrls?: string[];
  serialNumbering?: string;
  createdBy?: string;
  // Add description fields for compatibility
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
}

export interface CollectionItem {
  id: string;
  banknoteId: string;
  userId: string;
  condition: BanknoteCondition;
  purchaseDate?: string;
  purchasePrice?: number;
  privateNote?: string;
  publicNote?: string;
  isForSale: boolean;
  salePrice?: number;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  banknote?: DetailedBanknote;
  personalImages?: string[];
}

export type BanknoteCondition = "UNC" | "AU" | "XF" | "VF" | "F" | "VG" | "G" | "Fair" | "Poor";

export interface WishlistItem {
  id: string;
  banknoteId: string;
  userId: string;
  priority: "High" | "Medium" | "Low";
  note?: string;
  createdAt: string;
  banknote?: DetailedBanknote;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  country: string | null;
  about: string | null;
  role: string;
  rank: UserRank;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// Add a string type to UserRank to allow values from the database
export type UserRank = 'Newbie' | 'Collector' | 'Expert' | 'Master' | string;

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
  awardedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  referenceItemId: string | null;
  createdAt: string;
}

export interface BanknoteCategory {
  id: string;
  name: string;
  description: string | null;
  startYear: string | null;
  endYear: string | null;
  createdAt: string | null;
}

export interface BanknoteType {
  id: string;
  name: string;
  description: string | null;
  createdAt: string | null;
}

export interface BanknoteRarityLevel {
  id: string;
  code: string;
  description: string | null;
  createdAt: string | null;
}

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  excerpt: string;
  content: string;
  mainImageUrl: string;
  createdAt: string;
  updatedAt: string;
}

// Re-export types from other files
export * from './forum';
export * from './user';
export * from './banknote';
export * from './marketplace';
export * from './message';
