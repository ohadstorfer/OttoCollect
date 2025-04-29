
export type BanknoteCondition = 'UNC' | 'AU' | 'XF' | 'VF' | 'F' | 'VG' | 'G' | 'Fair' | 'Poor';

export interface Banknote {
  id: string;
  catalogId?: string;
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
  updatedAt?: string;
  createdBy?: string;
  type?: string;
  sultanName?: string;
  extendedPickNumber?: string;
  category?: string; // Added this property
}

export interface DetailedBanknote extends Banknote {
  pickNumber?: string;
  turkCatalogNumber?: string;
  sealNames?: string;
  rarity?: string;
  printer?: string;
  islamicYear?: string;
  gregorianYear?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
  serialNumbering?: string;
  securityElement?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  colors?: string | string[];
}

export interface BanknoteFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
}

export interface BanknoteFilters {
  search?: string;
  country_id?: string;
  categories?: string[];
  types?: string[];
}

export interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  collectionItem?: CollectionItem;
  source?: 'catalog' | 'collection' | 'marketplace' | 'wishlist';
  viewMode?: 'grid' | 'list';
}

export type BanknoteDetailSource = 'catalog' | 'collection' | 'wishlist' | 'marketplace';

export interface Currency {
  id: string;
  name: string;
  country_id: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}
