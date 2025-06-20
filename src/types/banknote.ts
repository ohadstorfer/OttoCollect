
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
