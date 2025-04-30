
import { ImageUrls } from '@/types/banknote';

/**
 * Normalizes image URLs into a string array
 * @param imageUrls The image URLs which can be a string or string[]
 * @param defaultImage Default image to use if no valid URLs provided
 * @returns A normalized array of image URLs
 */
export function normalizeImageUrls(
  imageUrls: ImageUrls | undefined | null,
  defaultImage: string = '/placeholder.svg'
): string[] {
  if (!imageUrls) {
    return [defaultImage];
  }
  
  // If it's already an array, filter out empty values and return
  if (Array.isArray(imageUrls)) {
    const validUrls = imageUrls.filter(url => !!url);
    return validUrls.length > 0 ? validUrls : [defaultImage];
  }
  
  // If it's a string, return as a single-item array
  return imageUrls ? [imageUrls] : [defaultImage];
}

/**
 * Gets the first valid image URL from a string or string[]
 * @param imageUrls The image URLs which can be a string or string[]
 * @param defaultImage Default image to use if no valid URLs provided
 * @returns The first valid image URL or the default image
 */
export function getFirstImageUrl(
  imageUrls: ImageUrls | undefined | null,
  defaultImage: string = '/placeholder.svg'
): string {
  if (!imageUrls) {
    return defaultImage;
  }
  
  // If it's an array, return the first valid URL
  if (Array.isArray(imageUrls)) {
    const firstValidUrl = imageUrls.find(url => !!url);
    return firstValidUrl || defaultImage;
  }
  
  // If it's a string, return it directly
  return imageUrls || defaultImage;
}
