import { supabase } from '@/integrations/supabase/client';

/**
 * Service to process the image cleanup queue
 */
export async function processImageCleanupQueue() {
  try {
    const { data, error } = await supabase.functions.invoke('delete-old-image', {
      body: {
        processQueue: true
      }
    });
    
    if (error) {
      console.error('Error processing image cleanup queue:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to process image cleanup queue:', error);
    throw error;
  }
}

/**
 * Get pending cleanup queue items count
 */
export async function getPendingCleanupCount() {
  try {
    // Only super admins can access this table
    const { count, error } = await supabase
      .from('image_cleanup_queue')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);
    
    if (error) {
      console.error('Error getting pending cleanup count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Failed to get pending cleanup count:', error);
    return 0;
  }
}