
import { ImageUrls } from "@/types/banknote";

/**
 * Normalizes image URLs to ensure they're in a consistent format
 * @param imageUrls Input image URLs which could be a string, array, or null/undefined
 * @returns Array of image URLs
 */
export function normalizeImageUrls(imageUrls: ImageUrls | null | undefined): string[] {
  if (!imageUrls) {
    return [];
  }

  if (typeof imageUrls === 'string') {
    return imageUrls ? [imageUrls] : [];
  }

  if (Array.isArray(imageUrls)) {
    return imageUrls.filter(url => !!url);
  }

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
