import { supabase } from '@/integrations/supabase/client';

/**
 * Service to handle image cleanup from the database queue
 * This service processes the image_cleanup_queue table and deletes old images from storage
 */

export interface ImageCleanupQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  image_url: string;
  banknote_id: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

/**
 * Process the image cleanup queue and delete old images from storage
 */
export async function processImageCleanupQueue(): Promise<{
  processed: number;
  errors: number;
  details: string[];
}> {
  try {
    console.log('Processing image cleanup queue via edge function...');

    const { data, error } = await supabase.functions.invoke('delete-old-image', {
      body: { processQueue: true }
    });

    if (error) {
      console.error('Edge function error processing cleanup queue:', error);
      throw error;
    }

    // Normalize response shape for existing callers
    const processed = data?.processed ?? 0;
    const errors = data?.errors ?? 0;
    const details: string[] = [
      ...(data?.details?.processedItems?.map((i: any) => `Deleted: ${i.filePath}`) || []),
      ...(data?.details?.errors?.map((e: any) => `Error: ${e.itemId} - ${e.error}`) || [])
    ];

    console.log(`Cleanup queue processed. Processed: ${processed}, Errors: ${errors}`);
    return { processed, errors, details };
  } catch (error) {
    console.error('Error in processImageCleanupQueue:', error);
    throw error;
  }
}

/**
 * Check if an image is still used by a banknote
 */
async function checkIfImageStillUsed(imageUrl: string, banknoteId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('is_image_used_by_banknote', {
        image_url: imageUrl,
        banknote_id: banknoteId
      });

    if (error) {
      console.error('Error checking if image is used by banknote:', error);
      return false; // Default to false to be safe
    }

    return data || false;
  } catch (error) {
    console.error('Error in checkIfImageStillUsed:', error);
    return false;
  }
}

/**
 * Delete an image from Supabase storage
 */
async function deleteImageFromStorage(imageUrl: string): Promise<boolean> {
  try {
    // Skip if no image URL
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('No image URL provided, skipping deletion');
      return true;
    }

    // Extract file path from URL
    const storageBaseUrl = `${supabase.supabaseUrl}/storage/v1/object/public/banknote_images/`;

    if (!imageUrl.startsWith(storageBaseUrl)) {
      console.log(`Image URL ${imageUrl} is not from our storage, skipping deletion`);
      return true;
    }

    const filePath = imageUrl.replace(storageBaseUrl, '');
    console.log(`Deleting file from storage: ${filePath}`);

    // Delete the file from storage
    const { error: deleteError } = await supabase.storage
      .from('banknote_images')
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting file from storage:', deleteError);
      return false;
    }

    console.log(`Successfully deleted image: ${filePath}`);
    return true;
  } catch (error) {
    console.error('Error in deleteImageFromStorage:', error);
    return false;
  }
}

/**
 * Mark a queue item as processed
 */
async function markQueueItemProcessed(itemId: string, errorMessage: string | null): Promise<void> {
  try {
    const { error } = await supabase
      .from('image_cleanup_queue')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error marking queue item as processed:', error);
    }
  } catch (error) {
    console.error('Error in markQueueItemProcessed:', error);
  }
}

/**
 * Get cleanup queue statistics
 */
export async function getCleanupQueueStats(): Promise<{
  total: number;
  processed: number;
  pending: number;
  errors: number;
}> {
  try {
    const { data, error } = await supabase
      .from('image_cleanup_queue')
      .select('processed, error_message');

    if (error) {
      console.error('Error fetching cleanup queue stats:', error);
      throw error;
    }

    const total = data?.length || 0;
    const processed = data?.filter(item => item.processed).length || 0;
    const pending = total - processed;
    const errors = data?.filter(item => item.processed && item.error_message).length || 0;

    return { total, processed, pending, errors };
  } catch (error) {
    console.error('Error in getCleanupQueueStats:', error);
    throw error;
  }
}

/**
 * Clean up old processed items from the queue (older than 30 days)
 */
export async function cleanupOldQueueItems(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('image_cleanup_queue')
      .delete()
      .eq('processed', true)
      .lt('processed_at', thirtyDaysAgo.toISOString())
      .select('id');
    
    if (error) {
      console.error('Error cleaning up old queue items:', error);
      throw error;
    }
    
    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old processed queue items`);
    return deletedCount;
  } catch (error) {
    console.error('Error in cleanupOldQueueItems:', error);
    throw error;
  }
}

// Minimal stub for EnhancedImageCleanupTool compatibility
export async function runImageCleanup(): Promise<any> {
  // No-op scan; implement real orphan scan if needed
  return {
    success: true,
    summary: {
      totalDbImages: 0,
      totalDbReferences: 0,
      totalStorageFiles: 0,
      orphanedFiles: 0,
      deletedFiles: 0,
      errors: 0
    },
    orphanedFilesList: [],
    errors: []
  };
}
