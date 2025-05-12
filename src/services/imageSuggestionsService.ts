
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Submit a banknote image suggestion to the catalog
 */
export async function submitImageSuggestion(data: {
  banknoteId: string;
  userId: string;
  obverseImage?: string | null;
  reverseImage?: string | null;
}) {
  try {
    if (!data.obverseImage && !data.reverseImage) {
      throw new Error("At least one image is required");
    }

    if (data.obverseImage) {
      // Insert obverse image suggestion
      const { error: obverseError } = await supabase
        .from('image_suggestions')
        .insert({
          banknote_id: data.banknoteId,
          user_id: data.userId,
          obverse_image: data.obverseImage,
          reverse_image: null,
          type: 'obverse',
          status: 'pending'
        });

      if (obverseError) {
        throw new Error(`Failed to submit obverse image: ${obverseError.message}`);
      }
    }

    if (data.reverseImage) {
      // Insert reverse image suggestion
      const { error: reverseError } = await supabase
        .from('image_suggestions')
        .insert({
          banknote_id: data.banknoteId,
          user_id: data.userId,
          obverse_image: null,
          reverse_image: data.reverseImage,
          type: 'reverse',
          status: 'pending'
        });

      if (reverseError) {
        throw new Error(`Failed to submit reverse image: ${reverseError.message}`);
      }
    }

    return true;
  } catch (error) {
    console.error("Error submitting image suggestion:", error);
    throw error;
  }
}

/**
 * Check if user has already submitted an image suggestion for this banknote
 */
export async function hasExistingImageSuggestion(banknoteId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('image_suggestions')
      .select('id')
      .eq('banknote_id', banknoteId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .limit(1);

    if (error) {
      throw new Error(`Failed to check existing suggestions: ${error.message}`);
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking existing image suggestions:", error);
    return false;
  }
}
