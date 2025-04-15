
export interface User {
  id: string;
  username: string; // Added username
  firstName?: string; // Made optional
  lastName?: string; // Made optional
  email: string;
  role: 'User' | 'Admin' | 'Super Admin'; // Added Super Admin
  avatarUrl?: string; // Added avatar URL
  country?: string; // Added country
  about?: string; // Added about
  rank?: string; // Added rank
  points?: number; // Added points
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
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
  pickNumber?: string; // Added to match actual usage
  sealNames?: string; // Added to match actual usage 
  turkCatalogNumber?: string; // Added to match actual usage
  rarity?: string; // Added to match actual usage
  isApproved: boolean;
  isPending: boolean;
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
  createdBy?: string; // Added to match actual usage
  obverseDescription?: string; // Added to match actual usage
  reverseDescription?: string; // Added to match actual usage
  // Additional fields from DetailedBanknote used across the app
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
  pickNumber?: string; // Added to match actual usage
  sealNames?: string; // Added to match actual usage
  turkCatalogNumber?: string; // Added to match actual usage
  rarity?: string; // Added to match actual usage
}

export interface CollectionItem {
  id: string;
  banknoteId: string;
  userId: string;
  condition: BanknoteCondition;
  purchasePrice?: number;
  purchaseDate?: Date | string; // Allow string or Date
  notes?: string;
  isForSale: boolean;
  salePrice?: number;
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
  banknote: Banknote;
  obverseImage?: string; // Added to match actual usage
  reverseImage?: string; // Added to match actual usage
  location?: string; // Added to match actual usage
  privateNote?: string; // Added to match actual usage
  publicNote?: string; // Added to match actual usage
  personalImages?: string[]; // Added to match actual usage
  orderIndex?: number; // Added to match actual usage in constants.ts
}

export interface WishlistItem {
  id: string;
  banknoteId: string;
  userId: string;
  priority: 'High' | 'Medium' | 'Low';
  note?: string;
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
  banknote: Banknote;
}

export type BanknoteCondition =
  | 'Uncirculated'
  | 'UNC'  // Added to match actual usage
  | 'AU'   // Added to match usage in constants.ts
  | 'XF'   // Added to match usage in constants.ts
  | 'Near Mint'
  | 'Extremely Fine'
  | 'Very Fine'
  | 'VF'   // Added to match usage in constants.ts
  | 'Fine'
  | 'F'    // Added to match usage in constants.ts
  | 'Very Good'
  | 'VG'   // Added to match usage in constants.ts
  | 'Good'
  | 'G'    // Added to match usage in constants.ts
  | 'Poor';

export interface MarketplaceItem {
  id: string;
  collectionItemId: string;
  sellerId: string;
  price?: number; // Make price optional
  description?: string;
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
  collectionItem: CollectionItem;
  status?: string; // Added to match usage in constants.ts
  seller?: { // Added to match usage in constants.ts
    id: string;
    username: string;
    rank: string;
  };
}

// Add missing interface for ForumPost
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

// Add missing interface for Message
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

// Add missing interface for BanknoteDetailSource
export type BanknoteDetailSource = "catalog" | "collection" | "marketplace";

// Banknote categories
export const BANKNOTE_CATEGORIES = [
  "First Kaime Em. 1–6",
  "First Kaime 1851–1861",
  "1893 War Banknote",
  "Imperial Ottoman Bank",
  "World War I Banknotes"
];

export const DEFAULT_SELECTED_CATEGORIES = [
  "First Kaime 1851–1861",
  "1893 War Banknote",
  "Imperial Ottoman Bank",
  "World War I Banknotes"
];

// Banknote types
export const BANKNOTE_TYPES = [
  "issued notes",
  "specimens",
  "Cancelled & Annule",
  "Trial note",
  "Error banknote",
  "Counterfeit banknote",
  "Emergency note", 
  "Check & Bond notes",
  "Other notes"
];

export const DEFAULT_SELECTED_TYPES = [
  "issued notes",
  "specimens",
  "Cancelled & Annule"
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
