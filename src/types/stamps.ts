
export interface StampPicture {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
  image_url: string;
  country_id: string;
  created_at: string;
  updated_at: string;
}

export interface SignaturePicture extends StampPicture {}
export interface SealPicture extends StampPicture {}
export interface WatermarkPicture extends StampPicture {}
export interface TughraPicture extends StampPicture {}

export type StampType = 'signatures_front' | 'signatures_back' | 'seal' | 'watermark' | 'tughra';

export interface StampUploadData {
  name: string;
  image_url: string;
  country_id: string;
}

export interface ImageFile {
  file: File;
  previewUrl: string;
}

export interface StampImage {
  id: string;
  url: string;
  type: 'tughra' | 'watermark' | 'other_element' | 'seal' | 'signature' | 'signature_front' | 'signature_back';
  created_at: string;
}

export interface StampImageUploadResponse {
  url: string;
  id: string;
}
