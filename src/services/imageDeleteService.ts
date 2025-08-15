import { supabase } from '@/integrations/supabase/client';

/**
 * Service to handle deleting old images when they are replaced
 */
export async function deleteOldImage(oldImageUrl: string, tableName: string, recordId: string, banknoteId?: string) {
  if (!oldImageUrl || oldImageUrl === '') {
    return { success: true, skipped: true, reason: 'No image URL provided' };
  }

  try {
    // Call the edge function to delete the old image
    const { data, error } = await supabase.functions.invoke('delete-old-image', {
      body: {
        imageUrl: oldImageUrl,
        tableName,
        recordId,
        banknoteId
      }
    });

    if (error) {
      console.error('Error calling delete-old-image function:', error);
      return { success: false, error: error.message };
    }

    return data;
  } catch (error) {
    console.error('Error in deleteOldImage service:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Helper function to check if we should delete an old image when updating
 */
export function shouldDeleteOldImage(oldValue: string | null, newValue: string | null): boolean {
  // Only delete if:
  // 1. There was an old value
  // 2. The new value is different from the old value
  // 3. The old value is not empty/null
  return !!(oldValue && newValue && oldValue !== newValue && oldValue.trim() !== '');
}