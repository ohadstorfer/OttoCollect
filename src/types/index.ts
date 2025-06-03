// Remove duplicate isRead declaration and consolidate
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  isRead: boolean;
  reference_item_id?: string;
  
  // Alias properties for compatibility
  senderId?: string;
  receiverId?: string;
  createdAt?: string;
}

export interface Role {
  id: string;
  name: string;
  created_at: string;
}

// Add explicit UserRank type with new ranking system
export type UserRank = 
  | 'Newbie Collector'
  | 'Beginner Collector' 
  | 'Mid Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Master Collector'
  | 'Admin Newbie Collector'
  | 'Admin Beginner Collector'
  | 'Admin Mid Collector'
  | 'Admin Known Collector'
  | 'Admin Advance Collector'
  | 'Admin Master Collector'
  | 'Super Admin Newbie Collector'
  | 'Super Admin Beginner Collector'
  | 'Super Admin Mid Collector'
  | 'Super Admin Known Collector'
  | 'Super Admin Advance Collector'
  | 'Super Admin Master Collector';

export type UserRole = string;

// Add interface for country admin assignment
export interface CountryAdminAssignment {
  id: string;
  user_id: string;
  country_id: string;
  created_at: string;
}

// User related interfaces
export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  about?: string;
  country?: string;
  role_id: string;
  role: UserRole;
  rank: string;
  points: number;
  createdAt: string;
  updatedAt?: string;
  blocked?: boolean;
  is_forum_blocked?: boolean;
}

// Banknote related interfaces
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
  islamicYear?: string;
  gregorianYear?: string;
  series?: string;
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  imageUrls: string[];  // Change to string[] to fix TypeScript errors
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  type?: string; // Adding type for compatibility
  sultanName?: string; // Adding sultanName for compatibility
  extendedPickNumber?: string; // Adding extended pick number for compatibility
  category?: string; // Adding category for compatibility
}

export interface DetailedBanknote extends Banknote {
  id: string;
  catalogId: string;
  country: string;
  denomination: string;
  year: string;
  series?: string;
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  pickNumber?: string;
  turkCatalogNumber?: string;
  sultanName?: string;
  sealNames?: string;
  rarity?: string;
  printer?: string;
  type?: string;
  category?: string;
  securityFeatures?: string[];
  watermark?: string;
  signatures?: string[];
  colors?: string[];
  gradeCounts?: Record<BanknoteCondition, number>;
  averagePrice?: number;
  islamicYear?: string;
  gregorianYear?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
  serialNumbering?: string;
  securityElement?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  extendedPickNumber?: string;
  name?: string;
}

export type BanknoteDetailSource = 'catalog' | 'collection' | 'marketplace' | 'wishlist';

export interface BanknoteFilters {
  country_id?: string;
  search?: string;
  categories?: string[];
  types?: string[];
  sort?: string[];
}

export interface BanknoteFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
  country_id?: string;
}

// Collection related interfaces
export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: DetailedBanknote;
  condition?: BanknoteCondition;
  grade_by?: string;
  grade?: string;
  grade_condition_description?: string;
  purchasePrice?: number;
  purchaseDate?: string | Date;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  personalImages?: string[];
  publicNote?: string;
  privateNote?: string;
  isForSale: boolean;
  salePrice?: number;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
  is_unlisted_banknote: boolean;
}

// Marketplace related interfaces
export interface MarketplaceItem {
  id: string;
  collectionItem: CollectionItem;
  sellerId: string;
  seller: User;
  status: 'Available' | 'Reserved' | 'Sold';
  createdAt: string;
  updatedAt: string;
}

// Define WishlistItem type for TS compatibility
export interface WishlistItem {
  id: string;
  userId: string;
  banknoteId: string;
  note?: string;
  priority: string;
  createdAt: string;
  banknote?: DetailedBanknote;
}

// Import and re-export types from other files
export * from './message';
export * from './forum';
// Explicit re-exports from filter to avoid duplication
export type { 
  CategoryDefinition, 
  TypeDefinition, 
  UserFilterPreference,
  FilterCategoryOption,
  DynamicFilterState,
  FilterableItem,
  Country,
  CountryData 
} from './filter';

// Re-export from banknote
export type { ImageUrls, Currency } from './banknote';
