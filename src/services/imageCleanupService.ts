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
    console.log('Processing image cleanup queue...');
    
    // Get unprocessed items from the queue
    const { data: queueItems, error: fetchError } = await supabase
      .from('image_cleanup_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10); // Process in batches

    if (fetchError) {
      console.error('Error fetching cleanup queue:', fetchError);
      throw fetchError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('No items in cleanup queue');
      return { processed: 0, errors: 0, details: ['No items to process'] };
    }

    console.log(`Processing ${queueItems.length} items from cleanup queue`);

    let processed = 0;
    let errors = 0;
    const details: string[] = [];

    for (const item of queueItems) {
      try {
        console.log(`Processing item ${item.id}: ${item.image_url}`);
        
        // Check if image is still in use (for collection items)
        if (item.table_name === 'collection_items' && item.banknote_id) {
          const isStillUsed = await checkIfImageStillUsed(item.image_url, item.banknote_id);
          if (isStillUsed) {
            console.log(`Image ${item.image_url} is still in use, skipping deletion`);
            await markQueueItemProcessed(item.id, 'Image still in use by banknote');
            processed++;
            details.push(`Skipped: ${item.image_url} (still in use)`);
            continue;
          }
        }

        // Delete the image from storage
        const deleteSuccess = await deleteImageFromStorage(item.image_url);
        
        if (deleteSuccess) {
          await markQueueItemProcessed(item.id, null);
          processed++;
          details.push(`Deleted: ${item.image_url}`);
          console.log(`Successfully deleted image: ${item.image_url}`);
        } else {
          await markQueueItemProcessed(item.id, 'Failed to delete from storage');
          errors++;
          details.push(`Failed: ${item.image_url}`);
          console.error(`Failed to delete image: ${item.image_url}`);
        }
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        await markQueueItemProcessed(item.id, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errors++;
        details.push(`Error: ${item.image_url} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Cleanup queue processing complete. Processed: ${processed}, Errors: ${errors}`);
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