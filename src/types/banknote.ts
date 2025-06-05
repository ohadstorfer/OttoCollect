
export interface DetailedBanknote {
  id: string;
  catalogId: string;
  extendedPickNumber: string;
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
  pickNumber?: string;
  turkCatalogNumber?: string;
  sultanName?: string;
  sealNames?: string;
  rarity?: string;
  printer?: string;
  type?: string;
  category?: string;
  islamicYear?: string;
  gregorianYear?: string;
  banknoteDescription?: string;
  historicalDescription?: string;
  serialNumbering?: string;
  securityElement?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  colors?: string;
  watermark?: string;
  // New resolved URL fields for stamp images
  signaturePictureUrls?: string[];
  sealPictureUrls?: string[];
  watermarkUrl?: string | null;
}

export interface Currency {
  id: string;
  name: string;
  display_order: number;
  country_id: string;
}

export interface BanknoteFilters {
  country_id?: string;
  search?: string;
  category?: string;
  type?: string;
  year?: string;
}

export type BanknoteCondition = 
  | 'Uncirculated'
  | 'Extremely Fine'
  | 'Very Fine'
  | 'Fine'
  | 'Very Good'
  | 'Good'
  | 'About Good'
  | 'Poor';
