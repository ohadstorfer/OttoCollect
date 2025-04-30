
export interface Currency {
  id: string;
  name: string;
  country_id: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

// Add an explicit definition for string or string[] type for imageUrls
export type ImageUrls = string | string[];

// Also add a helper function to handle image URLs safely
export function getFirstImageUrl(imageUrls: ImageUrls | undefined): string {
  if (!imageUrls) return '/placeholder.svg';
  return Array.isArray(imageUrls) ? (imageUrls[0] || '/placeholder.svg') : imageUrls;
}
