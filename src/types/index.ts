
// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  rank: UserRank;
  points: number;
  createdAt: string;
  avatarUrl?: string;
  country?: string;
  about?: string;
}

export type UserRole = 'User' | 'Admin' | 'Super Admin';

export type UserRank = 
  | 'Newbie'
  | 'Beginner Collector'
  | 'Casual Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Admin'
  | 'Super Admin';

// Banknote related types
export interface Banknote {
  id: string;
  pick_number?: string;
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
  // Add these properties to the basic Banknote interface
  // They'll be optional since not all banknote objects might have them
  turkCatalogNumber?: string;
  sealNames?: string;
  sultanName?: string;
  type?: string;
  printer?: string;
  rarity?: string;
}

export interface DetailedBanknote extends Banknote {
  extendedPickNumber?: string;
  pickNumber?: string;
  islamicYear?: string;
  gregorianYear?: string;
  faceValue?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  sealPictures?: string[];
  signaturePictures?: string[];
  watermarkPicture?: string;
  otherElementPictures?: string[];
  frontPicture?: string;
  backPicture?: string;
  tughraPicture?: string;
  category?: string;
  securityElement?: string;
  colors?: string;
  serialNumbering?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
}

export type BanknoteCondition = 
  | 'UNC' 
  | 'AU' 
  | 'XF' 
  | 'VF' 
  | 'F' 
  | 'VG' 
  | 'G';

// Collection related types
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
  obverseImage?: string;
  reverseImage?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  personalImages?: string[];
}

// Wishlist related types
export interface WishlistItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: Banknote;
  priority: 'Low' | 'Medium' | 'High';
  note?: string;
  createdAt: string;
}

// Marketplace related types
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
  status: 'Available' | 'Sold' | 'Reserved';
  createdAt: string;
  updatedAt: string;
}

// Messaging related types
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  referenceItemId?: string;
  isRead: boolean;
  createdAt: string;
}

// Forum/Blog related types
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: UserRank;
  };
  imageUrls: string[];
  comments?: ForumComment[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: UserRank;
  };
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
}

// Define the CountryData interface needed in Catalog.tsx
export interface CountryData {
  name: string;
  count: number;
  imageUrl: string | null;
}

// Define BanknoteDetailSource for components that need it
export type BanknoteDetailSource = 
  | 'collection' 
  | 'catalog' 
  | 'wish-list' 
  | 'marketplace' 
  | 'search' 
  | 'country-detail'
  | 'missing'
  | 'wishlist';
