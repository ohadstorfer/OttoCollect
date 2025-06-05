
export interface StampPicture {
  id: string;
  name: string;
  image_url: string;
  country_id: string;
  created_at: string;
  updated_at: string;
}

export interface SignaturePicture extends StampPicture {}
export interface SealPicture extends StampPicture {}
export interface WatermarkPicture extends StampPicture {}

export type StampType = 'signature' | 'seal' | 'watermark';

export interface StampUploadData {
  name: string;
  image_url: string;
  country_id: string;
}
