
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Submit a banknote image suggestion to the catalog
 */
export async function submitImageSuggestion(data: {
  banknoteId: string;
  userId: string;
  imageUrl: string;
  type: 'obverse' | 'reverse';
}) {
  try {
    console.log('Submitting image suggestion with data:', {
      banknote_id: data.banknoteId,
      user_id: data.userId,
      image_url: data.imageUrl,
      type: data.type
    });

    const { error } = await supabase
      .from('image_suggestions')
      .insert({
        banknote_id: data.banknoteId,
        user_id: data.userId,
        image_url: data.imageUrl,
        type: data.type,
        status: 'pending'
      });

    if (error) {
      console.error("Error submitting image suggestion:", error);
      throw new Error(`Failed to submit image suggestion: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error("Error submitting image suggestion:", error);
    throw error;
  }
}

/**
 * Check if user has already submitted an image suggestion for this banknote and type
 */
export async function hasExistingImageSuggestion(banknoteId: string, userId: string, type: 'obverse' | 'reverse'): Promise<{ 
  hasSuggestion: boolean; 
  status: 'pending' | 'approved' | 'rejected' | null;
}> {
  try {
    const { data, error } = await supabase
      .from('image_suggestions')
      .select('status')
      .eq('banknote_id', banknoteId)
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking existing image suggestions:", error);
      throw new Error(`Failed to check existing suggestions: ${error.message}`);
    }

    return {
      hasSuggestion: data && data.length > 0,
      status: data?.[0]?.status || null
    };
  } catch (error) {
    console.error("Error checking existing image suggestions:", error);
    return {
      hasSuggestion: false,
      status: null
    };
  }
}
