
export interface Banknote {
  id: string;
  catalogId: string;
  country: string;
  denomination: string;
  year: string;
  series: string;
  description: string;
  obverseDescription: string;
  reverseDescription: string;
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BanknoteDetailSource {
  type: 'catalog' | 'collection' | 'marketplace' | 'wishlist';
  id: string;
}

export interface CountryData {
  name: string;
  code: string;
  banknotes: Banknote[];
}
