export interface CountryData {
  id: string;
  name: string;
  code: string;
  flag_url: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  role?: Role;
  role_id?: string;
  country_id?: string;
  country?: CountryData;
  is_active?: boolean;
}

export interface Banknote {
  id: string;
  country: string;
  extendedPickNumber: string;
  pickNumber: string;
  turkCatalogNumber?: string;
  faceValue: string;
  islamicYear?: string;
  gregorianYear?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  signaturePictures?: string[];
  sealNames?: string;
  sealPictures?: string[];
  watermarkPicture?: string;
  otherElementPictures?: string[];
  frontPicture?: string;
  backPicture?: string;
  sultanName?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  securityElement?: string;
  colors?: string;
  serialNumbering?: string;
  description?: string;
  historicalDescription?: string;
  isApproved?: boolean;
  isPending?: boolean;
  createdAt?: string;
  updatedAt?: string;
  name?: string;
}

export interface DetailedBanknote extends Banknote {
  // Enhanced view fields with resolved URLs
  signaturePictureUrls?: string[];
  sealPictureUrls?: string[];
  watermarkUrl?: string;
  tughraUrl?: string;
}

export interface CollectionItem {
  id: string;
  banknote_id: string;
  user_id: string;
  condition?: string;
  grade?: string;
	grade_by?: string;
  grade_condition_description?: string;
  purchasePrice?: number;
  salePrice?: number;
  purchaseDate?: string;
  location?: string;
  privateNote?: string;
  publicNote?: string;
  isForSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
  banknote?: DetailedBanknote;
  is_unlisted_banknote: boolean;
}

export interface Suggestion {
  id: string;
  banknote_id: string;
  user_id: string;
  field_name: string;
  suggested_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface AdminComponentProps {
  countryId?: string;
  countryName?: string;
  isCountryAdmin?: boolean;
  disableCountrySelect?: boolean;
}
