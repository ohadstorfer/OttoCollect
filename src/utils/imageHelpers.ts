
import { ImageUrls } from "@/types";

/**
 * Safely gets the first image URL from an ImageUrls type (string or string[])
 * Returns a placeholder image if no image is available
 */
export function getFirstImageUrl(imageUrls: ImageUrls | undefined | null): string {
  if (!imageUrls) return '/placeholder.svg';
  return Array.isArray(imageUrls) ? (imageUrls[0] || '/placeholder.svg') : imageUrls;
}

/**
 * Gets an appropriate image for a collection item, prioritizing the item's own images
 * before falling back to the associated banknote's images
 */
export function getCollectionItemImage(
  itemImage: string | undefined | null, 
  banknoteImages: ImageUrls | undefined | null
): string {
  if (itemImage) return itemImage;
  return getFirstImageUrl(banknoteImages);
}

/**
 * Safely gets all images from ImageUrls as an array
 */
export function getAllImagesAsArray(imageUrls: ImageUrls | undefined | null): string[] {
  if (!imageUrls) return [];
  return Array.isArray(imageUrls) ? imageUrls : [imageUrls];
}
