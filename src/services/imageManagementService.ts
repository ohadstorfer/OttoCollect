import { supabase } from '@/integrations/supabase/client';
import { deleteOldImage, shouldDeleteOldImage } from './imageDeleteService';

/**
 * Service to manage image updates with automatic cleanup of old images
 */

interface ImageUpdateOptions {
  tableName: string;
  recordId: string;
  oldImageUrl?: string;
  newImageUrl?: string;
  banknoteId?: string; // For collection_items to check banknote usage
}

/**
 * Update an image field and automatically delete the old image
 */
export async function updateImageWithCleanup(options: ImageUpdateOptions) {
  const { tableName, recordId, oldImageUrl, newImageUrl, banknoteId } = options;
  
  // Only attempt to delete if we should
  if (shouldDeleteOldImage(oldImageUrl || null, newImageUrl || null)) {
    // Delete the old image asynchronously (don't wait for it)
    deleteOldImage(oldImageUrl!, tableName, recordId, banknoteId).catch(error => {
      console.warn('Failed to delete old image:', error);
      // Don't throw - this is a cleanup operation
    });
  }
  
  return { success: true };
}

/**
 * Helper to update profile avatar with cleanup
 */
export async function updateProfileAvatar(userId: string, oldAvatarUrl: string | null, newAvatarUrl: string) {
  // Update the avatar in the database
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: newAvatarUrl })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  // Clean up old image
  if (shouldDeleteOldImage(oldAvatarUrl, newAvatarUrl)) {
    deleteOldImage(oldAvatarUrl!, 'profiles', userId).catch(error => {
      console.warn('Failed to delete old avatar:', error);
    });
  }

  return newAvatarUrl;
}

/**
 * Helper to update collection item images with cleanup
 */
export async function updateCollectionItemImages(
  itemId: string, 
  updates: any, 
  oldItem: any,
  banknoteId?: string
) {
  // Update the collection item
  const { error } = await supabase
    .from('collection_items')
    .update(updates)
    .eq('id', itemId);

  if (error) {
    throw error;
  }

  // Clean up old images
  const imageFields = [
    'obverse_image',
    'reverse_image', 
    'obverse_image_watermarked',
    'reverse_image_watermarked',
    'obverse_image_thumbnail',
    'reverse_image_thumbnail'
  ];

  for (const field of imageFields) {
    const oldUrl = oldItem[field];
    const newUrl = updates[field];
    
    if (shouldDeleteOldImage(oldUrl, newUrl)) {
      deleteOldImage(oldUrl, 'collection_items', itemId, banknoteId).catch(error => {
        console.warn(`Failed to delete old ${field}:`, error);
      });
    }
  }

  return updates;
}

/**
 * Helper to update banknote images with cleanup
 */
export async function updateBanknoteImages(banknoteId: string, updates: any, oldBanknote: any) {
  // Update the banknote
  const { error } = await supabase
    .from('detailed_banknotes')
    .update(updates)
    .eq('id', banknoteId);

  if (error) {
    throw error;
  }

  // Clean up old images
  const imageFields = [
    'front_picture',
    'back_picture',
    'front_picture_watermarked', 
    'back_picture_watermarked',
    'front_picture_thumbnail',
    'back_picture_thumbnail',
    'watermark_picture',
    'tughra_picture'
  ];

  for (const field of imageFields) {
    const oldUrl = oldBanknote[field];
    const newUrl = updates[field];
    
    if (shouldDeleteOldImage(oldUrl, newUrl)) {
      deleteOldImage(oldUrl, 'detailed_banknotes', banknoteId).catch(error => {
        console.warn(`Failed to delete old ${field}:`, error);
      });
    }
  }

  // Handle array fields
  const arrayFields = [
    'signature_pictures',
    'seal_pictures', 
    'other_element_pictures'
  ];

  for (const field of arrayFields) {
    const oldUrls = oldBanknote[field] || [];
    const newUrls = updates[field] || [];
    
    // Find URLs that were removed
    for (const oldUrl of oldUrls) {
      if (oldUrl && !newUrls.includes(oldUrl)) {
        deleteOldImage(oldUrl, 'detailed_banknotes', banknoteId).catch(error => {
          console.warn(`Failed to delete old ${field} image:`, error);
        });
      }
    }
  }

  return updates;
}