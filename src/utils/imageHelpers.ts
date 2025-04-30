
import { ImageUrls } from '@/types/banknote';

/**
 * Normalizes image URLs to an array format
 * 
 * @param imageUrls String or array of image URLs
 * @param defaultImage Optional default image to use if no images are available
 * @returns Array of image URLs
 */
export const normalizeImageUrls = (
  imageUrls: ImageUrls | undefined | null, 
  defaultImage: string = '/placeholder.svg'
): string[] => {
  if (!imageUrls) {
    return [defaultImage];
  }
  
  if (Array.isArray(imageUrls)) {
    return imageUrls.length > 0 ? imageUrls : [defaultImage];
  }
  
  return imageUrls ? [imageUrls] : [defaultImage];
};

/**
 * Gets the first image URL from a string or array
 * 
 * @param imageUrls String or array of image URLs
 * @param defaultImage Optional default image to use if no images are available
 * @returns First image URL or default image
 */
export const getFirstImageUrl = (
  imageUrls: ImageUrls | undefined | null,
  defaultImage: string = '/placeholder.svg'
): string => {
  if (!imageUrls) {
    return defaultImage;
  }
  
  if (Array.isArray(imageUrls)) {
    return imageUrls.length > 0 ? imageUrls[0] : defaultImage;
  }
  
  return imageUrls || defaultImage;
};
