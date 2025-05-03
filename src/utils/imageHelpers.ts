
import { ImageUrls } from "@/types/banknote";

/**
 * Normalizes image URLs to ensure they're in a consistent format
 * @param imageUrls Input image URLs which could be a string, array, or null/undefined
 * @returns Array of image URLs
 */
export function normalizeImageUrls(imageUrls: ImageUrls | null | undefined): string[] {
  console.log("normalizeImageUrls input:", {
    imageUrls,
    type: imageUrls ? (typeof imageUrls === 'string' ? 'string' : Array.isArray(imageUrls) ? 'array' : 'other') : 'null/undefined'
  });
  
  if (!imageUrls) {
    console.log("normalizeImageUrls: empty input, returning empty array");
    return [];
  }

  if (typeof imageUrls === 'string') {
    console.log("normalizeImageUrls: string input converted to array", imageUrls ? [imageUrls] : []);
    return imageUrls ? [imageUrls] : [];
  }

  if (Array.isArray(imageUrls)) {
    const filtered = imageUrls.filter(url => !!url);
    console.log("normalizeImageUrls: array input filtered", {
      original: imageUrls,
      filtered: filtered
    });
    return filtered;
  }

  console.log("normalizeImageUrls: unhandled input type, returning empty array");
  return [];
}

/**
 * Gets the first image URL from a set of image URLs or returns a fallback
 * @param imageUrls Input image URLs which could be a string, array, or null/undefined
 * @param fallback Fallback URL to use if no valid URLs are found
 * @returns A single image URL
 */
export function getFirstImageUrl(imageUrls: ImageUrls | null | undefined, fallback: string = '/placeholder.svg'): string {
  console.log("getFirstImageUrl input:", {
    imageUrls,
    fallback,
    type: imageUrls ? (typeof imageUrls === 'string' ? 'string' : Array.isArray(imageUrls) ? 'array' : 'other') : 'null/undefined'
  });
  
  const normalized = normalizeImageUrls(imageUrls);
  const result = normalized.length > 0 ? normalized[0] : fallback;
  
  console.log("getFirstImageUrl result:", result);
  return result;
}
