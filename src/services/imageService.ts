
import { supabase } from '@/integrations/supabase/client';
import { ImageSuggestion } from '@/types/forum';

// Check if the user has an existing suggestion for a banknote
export async function checkImageSuggestion(
  banknoteId: string, 
  userId: string, 
  type: 'obverse' | 'reverse'
): Promise<{id: string, status: string} | null> {
  try {
    const { data, error } = await supabase.rpc(
      'check_image_suggestion',
      { 
        p_banknote_id: banknoteId,
        p_user_id: userId,
        p_type: type
      }
    );
      
    if (error) {
      console.error("Error checking suggestion:", error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error checking image suggestion:", error);
    return null;
  }
}

// Update an existing image suggestion
export async function updateImageSuggestion(
  suggestionId: string,
  imageUrl: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      'update_image_suggestion',
      {
        p_suggestion_id: suggestionId,
        p_image_url: imageUrl
      }
    );
      
    if (error) {
      console.error("Error updating suggestion:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating image suggestion:", error);
    return false;
  }
}

// Create a new image suggestion
export async function createImageSuggestion(
  banknoteId: string,
  userId: string,
  imageUrl: string,
  type: 'obverse' | 'reverse'
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      'create_image_suggestion',
      {
        p_banknote_id: banknoteId,
        p_user_id: userId,
        p_image_url: imageUrl,
        p_type: type
      }
    );
      
    if (error) {
      console.error("Error creating suggestion:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error creating image suggestion:", error);
    return false;
  }
}

// Get count of pending image suggestions
export async function countPendingImageSuggestions(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('count_pending_image_suggestions');
      
    if (error) {
      console.error("Error counting suggestions:", error);
      return 0;
    }
    
    return data || 0;
  } catch (error) {
    console.error("Error counting image suggestions:", error);
    return 0;
  }
}

// Get image suggestions with pagination
export async function fetchImageSuggestions(
  limit: number,
  offset: number
): Promise<ImageSuggestion[]> {
  try {
    const { data, error } = await supabase.rpc(
      'get_image_suggestions',
      {
        p_limit: limit,
        p_offset: offset
      }
    );

    if (error) {
      console.error("Error fetching image suggestions:", error);
      return [];
    }

    // Map the data to our ImageSuggestion type
    const suggestions: ImageSuggestion[] = data.map((item: any) => ({
      id: item.id,
      banknoteId: item.banknote_id,
      userId: item.user_id,
      imageUrl: item.image_url,
      type: item.type as 'obverse' | 'reverse',
      status: item.status,
      createdAt: item.created_at,
      banknote: {
        catalogId: item.catalogid,
        country: item.country,
        denomination: item.denomination
      },
      user: {
        username: item.username || 'Unknown User',
        avatarUrl: item.avatar_url
      }
    }));

    return suggestions;
  } catch (error) {
    console.error("Error fetching image suggestions:", error);
    return [];
  }
}

// Approve an image suggestion
export async function approveImageSuggestion(suggestionId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      'approve_image_suggestion',
      { 
        p_suggestion_id: suggestionId
      }
    );
    
    if (error) {
      console.error("Error approving suggestion:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error approving image suggestion:", error);
    return false;
  }
}

// Reject an image suggestion
export async function rejectImageSuggestion(suggestionId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      'reject_image_suggestion',
      { 
        p_suggestion_id: suggestionId
      }
    );
    
    if (error) {
      console.error("Error rejecting suggestion:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error rejecting image suggestion:", error);
    return false;
  }
}
