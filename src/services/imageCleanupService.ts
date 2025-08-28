
import { supabase } from '@/integrations/supabase/client';

export interface CleanupResult {
  processed: number;
  errors: string[];
  success: boolean;
}

export const runImageCleanup = async (): Promise<CleanupResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('cleanup-orphaned-images');
    
    if (error) {
      return {
        processed: 0,
        errors: [error.message],
        success: false
      };
    }

    return data || { processed: 0, errors: [], success: true };
  } catch (error) {
    return {
      processed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      success: false
    };
  }
};

export const getCleanupQueueCount = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('image_cleanup_queue')
      .select('*', { count: 'exact', head: true })
      .eq('processed', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting cleanup queue count:', error);
    return 0;
  }
};
