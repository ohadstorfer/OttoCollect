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

// Add explicit UserRank type
export type UserRank = 
  | 'Newbie' 
  | 'Bronze' 
  | 'Silver' 
  | 'Gold' 
  | 'Platinum' 
  | 'Super Collector'
  | 'Beginner Collector'
  | 'Casual Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Expert'
  | 'Master'
  | 'Grandmaster'
  | 'Admin'
  | 'Super Admin';

// Update UserRole type to allow any string since roles are now dynamic
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
  rank: UserRank;
  points: number;
  createdAt: string;
  updatedAt?: string;
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
  banknote: Banknote;
  condition: BanknoteCondition;
  purchasePrice?: number;
  purchaseDate?: string | Date;  // Allow both string and Date
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
  banknote?: Banknote;
}

// Import and re-export types from other files
export * from './message';
export * from './forum';
export * from './filter';
export * from './banknote';

// Add CountryData type if it doesn't exist
export interface CountryData {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  banknoteCount?: number;
  created_at?: string;
  updated_at?: string;
}
