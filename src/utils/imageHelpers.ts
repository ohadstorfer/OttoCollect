
import { ImageUrls } from "@/types/banknote";

/**
 * Normalizes image URLs to ensure they're in a consistent format
 * @param imageUrls Input image URLs which could be a string, array, or null/undefined
 * @returns Array of image URLs
 */
export function normalizeImageUrls(imageUrls: ImageUrls | null | undefined): string[] {
  // Handle null/undefined case
  if (!imageUrls) {
    return [];
  }

  // Handle string case
  if (typeof imageUrls === 'string') {
    return imageUrls.trim() ? [imageUrls] : [];
  }

  // Handle array case
  if (Array.isArray(imageUrls)) {
    // Filter out empty, null or undefined values
    return imageUrls.filter(url => url && url.trim().length > 0);
  }

  // Fallback for unexpected type
  console.warn("Unexpected imageUrls type:", typeof imageUrls);
  return [];
}

/**
 * Gets the first image URL from a set of image URLs or returns a fallback
 * @param imageUrls Input image URLs which could be a string, array, or null/undefined
 * @param fallback Fallback URL to use if no valid URLs are found
 * @returns A single image URL
 */
export function getFirstImageUrl(imageUrls: ImageUrls | null | undefined, fallback: string = '/placeholder.svg'): string {
  const normalized = normalizeImageUrls(imageUrls);
  return normalized.length > 0 ? normalized[0] : fallback;
}

/**
 * Formats an object with either an obverse image or banknote images into a single image URL
 * @param item Object containing either obverseImage or banknote.imageUrls
 * @param fallback Fallback URL to use if no valid URLs are found
 * @returns A single image URL
 */
export function getItemImageUrl(
  item: { obverseImage?: string | null; banknote?: { imageUrls?: ImageUrls | null } | null } | null | undefined, 
  fallback: string = '/placeholder.svg'
): string {
  if (!item) return fallback;
  
  // First try the obverse image
  if (item.obverseImage) {
    return item.obverseImage;
  }
  
  // Then try the banknote images
  if (item.banknote?.imageUrls) {
    return getFirstImageUrl(item.banknote.imageUrls, fallback);
  }
  
  // Fallback if nothing found
  return fallback;
}
