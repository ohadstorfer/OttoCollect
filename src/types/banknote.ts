
// Basic type for image URLs - can be a string or array of strings
export type ImageUrls = string | string[];

// Type for banknote categories
export interface BanknoteCategory {
  id: string;
  name: string;
  description?: string;
}

// Type for banknote types
export interface BanknoteType {
  id: string;
  name: string;
  description?: string;
}

// Type for sort options
export interface SortOption {
  id: string;
  name: string;
  fieldName: string;
}

// Type for currencies
export interface Currency {
  id: string;
  name: string;
  display_order: number;
  country_id: string;
  created_at?: string;
  updated_at?: string;
}

// Enhanced banknote type with resolved stamp image URLs
export interface EnhancedBanknote {
  id: string;
  country: string;
  extended_pick_number: string;
  pick_number: string;
  turk_catalog_number?: string;
  face_value: string;
  islamic_year?: string;
  gregorian_year?: string;
  signatures_front?: string[];
  signatures_back?: string[];
  signature_pictures?: string[];
  seal_names?: string;
  seal_pictures?: string[];
  watermark_picture?: string;
  other_element_pictures?: string[];
  front_picture?: string;
  back_picture?: string;
  front_picture_watermarked?: string;
  sultan_name?: string;
  tughra_picture?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  security_element?: string;
  colors?: string;
  serial_numbering?: string;
  banknote_description?: string;
  historical_description?: string;
  dimensions?: string;
  is_approved: boolean;
  is_pending: boolean;
  created_at: string;
  updated_at: string;
  
  // New resolved URL fields from the enhanced view
  signatures_front_urls?: string[];
  signatures_back_urls?: string[];
  seal_picture_urls?: string[];
  watermark_picture_url?: string;
  tughra_picture_url?: string;
  
  
  // New authority_name field
  authority_name?: string;
}

export interface DetailedBanknote {
  id: string;
  country: string;
  denomination: string;
  pickNumber?: string;
  extendedPickNumber?: string;
  turkCatalogNumber?: string;
  category?: string;
  type?: string;
  sultanName?: string;
  authorityName?: string;
  gregorianYear?: string;
  islamicYear?: string;
  description?: string;
  historicalDescription?: string;
  securityElement?: string;
  sealNames?: string;
  signaturesFront?: string;
  signaturesBack?: string;
  signaturesFrontUrls: string[];
  signaturesBackUrls: string[];
  sealPictureUrls: string[];
  watermarkUrl?: string;
  tughraUrl?: string;
  otherElementPictures?: string[];
  serialNumbering?: string;
  rarity?: string;
  name?: string;
  dimensions?: string;
  
  // Translation fields - these preserve the translated content from enhanced_banknotes_with_translations view
  face_value?: string;
  face_value_translated?: string;
  face_value_ar?: string;
  face_value_tr?: string;
  sultan_name_translated?: string;
  sultan_name_ar?: string;
  sultan_name_tr?: string;
  signatures_front_translated?: string[];
  signatures_front_ar?: string[];
  signatures_front_tr?: string[];
  signatures_back_translated?: string[];
  signatures_back_ar?: string[];
  signatures_back_tr?: string[];
  seal_names_translated?: string;
  seal_names_ar?: string;
  seal_names_tr?: string;
}

export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: DetailedBanknote;
  condition?: BanknoteCondition | null;
  grade_by?: string | null;
  grade?: string | null;
  grade_condition_description?: string | null;
  salePrice?: number | null;
  isForSale?: boolean;
  is_for_sale?: boolean;
  publicNote?: string | null;
  privateNote?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  location?: string | null;
  obverseImage?: string | null;
  reverseImage?: string | null;
  obverse_image_watermarked?: string | null;
  reverse_image_watermarked?: string | null;
  obverse_image_thumbnail?: string | null;
  reverse_image_thumbnail?: string | null;
  orderIndex?: number;
  order_index?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  is_unlisted_banknote?: boolean;
  unlisted_banknotes_id?: string;
  hide_images?: boolean;
  type?: string | null;
  prefix?: string | null;
}
