
export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: 'User' | 'Admin' | 'Super Admin';
  avatarUrl?: string;
  country?: string;
  about?: string;
  rank?: string;
  points?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type UserRole = 'User' | 'Admin' | 'Super Admin';
export type UserRank = 'Newbie' | 'Beginner Collector' | 'Casual Collector' | 'Known Collector' | 'Advance Collector' | 'Expert' | 'Master' | 'Admin' | 'Super Admin';

export interface Banknote {
  id: string;
  catalogId: string;
  country: string;
  denomination: string;
  year: string;
  imageUrls: string[];
  description?: string;
  series?: string;
  type?: string;
  sultanName?: string;
  extendedPickNumber?: string;
  pickNumber?: string;
  sealNames?: string;
  turkCatalogNumber?: string;
  rarity?: string;
  isApproved: boolean;
  isPending: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  islamicYear?: string;
  gregorianYear?: string;
  category?: string;
  printer?: string;
  colors?: string;
  serialNumbering?: string;
  securityElement?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
}

export interface DetailedBanknote extends Banknote {
  gradeCounts: { [grade: string]: number };
  averagePrice: number | null;
}

export interface CollectionItem {
  id: string;
  banknoteId: string;
  userId: string;
  condition: BanknoteCondition;
  purchasePrice?: number;
  purchaseDate?: Date | string;
  notes?: string;
  isForSale: boolean;
  salePrice?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  banknote: Banknote;
  obverseImage?: string;
  reverseImage?: string;
  location?: string;
  privateNote?: string;
  publicNote?: string;
  personalImages?: string[];
  orderIndex?: number;
}

export interface WishlistItem {
  id: string;
  banknoteId: string;
  userId: string;
  priority: 'High' | 'Medium' | 'Low';
  note?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  banknote: Banknote;
}

export type BanknoteCondition =
  | 'Uncirculated'
  | 'UNC'
  | 'AU'
  | 'Near Mint'
  | 'Extremely Fine'
  | 'XF'
  | 'Very Fine'
  | 'VF'
  | 'Fine'
  | 'F'
  | 'Very Good'
  | 'VG'
  | 'Good'
  | 'G'
  | 'Poor';

export interface MarketplaceItem {
  id: string;
  collectionItemId: string;
  sellerId: string;
  price?: number;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  collectionItem: CollectionItem;
  status?: string;
  seller?: {
    id: string;
    username: string;
    rank: string;
  };
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author?: User;
  commentCount?: number;
  viewCount?: number;
  imageUrls?: string[];
  isPinned?: boolean;
  category?: string;
  excerpt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: Date | string;
  sender?: User;
  recipient?: User;
}

export type BanknoteDetailSource = "catalog" | "collection" | "marketplace";

// Banknote categories - updated to match actual database values
export const BANKNOTE_CATEGORIES = [
  "First Kaime Em. 1-6",
  "First Kaime 1851-1861",
  "1893 War Banknote",
  "Imperial Ottoman Bank",
  "World War I banknotes"
];

// Default selected categories - updated to match actual database values
export const DEFAULT_SELECTED_CATEGORIES = [
  "First Kaime 1851-1861",
  "1893 War Banknote",
  "Imperial Ottoman Bank",
  "World War I banknotes"
];

// Banknote types - updated to match actual database values
export const BANKNOTE_TYPES = [
  "Issued note",
  "Specimen",
  "Cancelled",
  "Trial note",
  "Error banknote",
  "Counterfeit banknote",
  "Emergency note", 
  "Check & Bond notes",
  "Other notes"
];

// Default selected types - updated to match actual database values
export const DEFAULT_SELECTED_TYPES = [
  "Issued note",
  "Specimen", 
  "Cancelled"
];

// Sort options
export const SORT_OPTIONS = [
  { id: "sultan", name: "Sultan" },
  { id: "faceValue", name: "Face Value" },
  { id: "extPick", name: "Ext. Pick#", required: true }
];

export interface BanknoteFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
}

export interface CountryData {
  id: string;
  name: string;
  banknoteCount: number;
  imageUrl?: string;
}
