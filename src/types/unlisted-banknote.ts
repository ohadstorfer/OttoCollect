import { ImageFile } from './stamps';

export interface UnlistedBanknote {
  id: string;
  country: string;
  extended_pick_number: string;
  pick_number?: string;
  turk_catalog_number?: string;
  face_value: string;
  islamic_year?: string;
  gregorian_year?: string;
  sultan_name?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  name?: string;
  dimensions?: string;
  
  // Image fields
  tughra_picture?: string;
  watermark_picture?: string;
  other_element_pictures?: string[];
  seal_pictures?: string[];
  signature_pictures?: string[];
  signatures_front?: string[];
  signatures_back?: string[];
}

export interface UnlistedBanknoteFormData {
  // Basic fields
  faceValueInt: number | string;
  faceValueCurrency: string;
  name: string;
  categoryId: string;
  typeId: string;
  dimensions?: string;
  
  // Optional fields
  gregorian_year?: string;
  islamic_year?: string;
  sultan_name?: string;
  printer?: string;
  rarity?: string;
  
  // Image fields
  tughra_picture?: string;
  watermark_picture?: string;
  other_element_files?: ImageFile[];
  seal_files?: ImageFile[];
  signature_files?: ImageFile[];
  signatures_front_files?: ImageFile[];
  signatures_back_files?: ImageFile[];
} 