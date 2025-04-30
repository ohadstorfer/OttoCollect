
import { ImageUrls } from "@/types/banknote";

/**
 * Safely gets the first image URL from an ImageUrls type (string or string[])
 * Returns a placeholder image if no image is available
 */
export function getFirstImageUrl(imageUrls: ImageUrls | undefined): string {
  if (!imageUrls) return '/placeholder.svg';
  return Array.isArray(imageUrls) ? (imageUrls[0] || '/placeholder.svg') : imageUrls;
}

/**
 * Gets an appropriate image for a collection item, prioritizing the item's own images
 * before falling back to the associated banknote's images
 */
export function getCollectionItemImage(
  itemImage: string | undefined, 
  banknoteImages: ImageUrls | undefined
): string {
  if (itemImage) return itemImage;
  return getFirstImageUrl(banknoteImages);
}
