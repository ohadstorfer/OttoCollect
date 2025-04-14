export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'User' | 'Admin';
  createdAt?: Date;
  updatedAt?: Date;
}

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
  isApproved: boolean;
  isPending: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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
  purchaseDate?: Date;
  notes?: string;
  isForSale: boolean;
  salePrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
  banknote: Banknote;
}

export interface WishlistItem {
  id: string;
  banknoteId: string;
  userId: string;
  priority: 'High' | 'Medium' | 'Low';
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
  banknote: Banknote;
}

export type BanknoteCondition =
  | 'Uncirculated'
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
  createdAt?: Date;
  updatedAt?: Date;
  collectionItem: CollectionItem;
}

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
