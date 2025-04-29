
// Add this to your DetailedBanknote interface or extend it
export interface DetailedBanknote {
  id: string;
  country: string;
  denomination: string;
  imageUrls?: string[];
  year?: string;
  pickNumber?: string;
  extendedPickNumber?: string;
  extended_pick_number?: string; // Legacy property
  turkCatalogNumber?: string;
  rarity?: string;
  sultanName?: string;
  sealNames?: string;
  category?: string;
  type?: string;
  catalogId?: string;
  isPending?: boolean;
  isApproved?: boolean;
  faceValue?: string;
  face_value?: string; // Legacy property
  createdAt?: string;
  created_at?: string; // Legacy property
  updatedAt?: string;
  updated_at?: string;
  
  // Additional properties for catalog details
  islamicYear?: string;
  islamic_year?: string;
  gregorianYear?: string;
  gregorian_year?: string;
  signaturesFront?: string;
  signatures_front?: string;
  signaturesBack?: string;
  signatures_back?: string;
  printer?: string;
  colors?: string;
  serialNumbering?: string;
  serial_numbering?: string;
  securityElement?: string;
  security_element?: string;
  banknoteDescription?: string;
  banknote_description?: string;
  historicalDescription?: string;
  historical_description?: string;
}

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
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: DetailedBanknote;
  condition: BanknoteCondition;
  purchaseDate?: string;
  purchasePrice?: number;
  salePrice?: number;
  isForSale: boolean;
  publicNote?: string;
  privateNote?: string;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  createdAt: string;
  updatedAt: string;
  orderIndex?: number;
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

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  about?: string;
  country?: string;
  role: string;
  role_id?: string;
  rank: UserRank;
  points: number;
  createdAt: string;
  updatedAt?: string;
}

export type UserRank = 
  | 'Newbie'
  | 'Beginner Collector'
  | 'Casual Collector'
  | 'Known Collector'
  | 'Advance Collector'
  | 'Expert'
  | 'Master'
  | 'Admin'
  | 'Super Admin';

export type UserRole = 
  | 'User'
  | 'Admin'
  | 'Super Admin'
  | 'Country Admin';

export interface Role {
  id: string;
  name: string;
  is_country_admin?: boolean;
  created_at?: string;
}

export interface CountryData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  banknoteId: string;
  collectionItemId: string;
  banknote: DetailedBanknote;
  seller: User;
  price: number;
  condition: BanknoteCondition;
  status: 'Available' | 'Sold' | 'Reserved';
  createdAt: string;
  updatedAt: string;
}

export interface BanknoteFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
  country_id?: string;
  group_mode?: boolean;
}

// Re-export types from other files
export * from './banknote.d';
export * from './message';
export * from './forum';
export * from './filter';
export * from './admin';
