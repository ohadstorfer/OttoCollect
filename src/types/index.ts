
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
export type UserRank = 'Newbie' | 'Collector' | 'Expert' | 'Master';

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
  | 'Near Mint'
  | 'Extremely Fine'
  | 'Very Fine'
  | 'Fine'
  | 'Very Good'
  | 'Good'
  | 'Poor';

export interface MarketplaceItem {
  id: string;
  collectionItemId: string;
  sellerId: string;
  price: number;
  description?: string;
  createdAt?: Date | string; // Allow string or Date
  updatedAt?: Date | string; // Allow string or Date
  collectionItem: CollectionItem;
}

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
