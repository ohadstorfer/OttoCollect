
import { supabase } from '@/integrations/supabase/client';
import { ImageSuggestion } from '@/types/forum';

// Check if an image suggestion already exists for this banknote/user/type
export const checkImageSuggestion = async (
  banknoteId: string,
  userId: string,
  type: 'obverse' | 'reverse'
): Promise<ImageSuggestion | null> => {
  try {
    const { data, error } = await supabase
      .from('image_suggestions')
      .select('*')
      .eq('banknote_id', banknoteId)
      .eq('user_id', userId)
      .eq('type', type)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // No rows returned is not an error for us
        console.error('Error checking image suggestion:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      banknoteId: data.banknote_id,
      userId: data.user_id,
      imageUrl: data.image_url,
      type: data.type as 'obverse' | 'reverse',
      status: data.status as 'pending' | 'approved' | 'rejected',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in checkImageSuggestion:', error);
    return null;
  }
};

// Update an existing image suggestion
export const updateImageSuggestion = async (
  suggestionId: string,
  imageUrl: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('image_suggestions')
      .update({
        image_url: imageUrl,
        status: 'pending', // Reset to pending if it was previously rejected
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      console.error('Error updating image suggestion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateImageSuggestion:', error);
    return false;
  }
};

// Create a new image suggestion
export const createImageSuggestion = async (
  banknoteId: string,
  userId: string,
  imageUrl: string,
  type: 'obverse' | 'reverse'
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('image_suggestions')
      .insert([{
        banknote_id: banknoteId,
        user_id: userId,
        image_url: imageUrl,
        type,
        status: 'pending'
      }]);

    if (error) {
      console.error('Error creating image suggestion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createImageSuggestion:', error);
    return false;
  }
};

// Get count of pending image suggestions (for admins)
export const countPendingImageSuggestions = async (): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('image_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Error counting pending image suggestions:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in countPendingImageSuggestions:', error);
    return 0;
  }
};

// Get image suggestions with banknote details and user info
export const getImageSuggestions = async (
  status?: 'pending' | 'approved' | 'rejected'
): Promise<ImageSuggestion[]> => {
  try {
    let query = supabase
      .from('image_suggestions')
      .select(`
        *,
        profiles:user_id (username, avatar_url),
        detailed_banknotes:banknote_id (id, country, face_value, extended_pick_number)
      `);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting image suggestions:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      banknoteId: item.banknote_id,
      userId: item.user_id,
      imageUrl: item.image_url,
      type: item.type as 'obverse' | 'reverse',
      status: item.status as 'pending' | 'approved' | 'rejected',
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      user: item.profiles ? {
        username: item.profiles.username,
        avatarUrl: item.profiles.avatar_url
      } : undefined,
      banknote: item.detailed_banknotes ? {
        catalogId: item.detailed_banknotes.extended_pick_number,
        country: item.detailed_banknotes.country,
        denomination: item.detailed_banknotes.face_value
      } : undefined
    }));
  } catch (error) {
    console.error('Error in getImageSuggestions:', error);
    return [];
  }
};

// Approve an image suggestion and update the banknote image
export const approveImageSuggestion = async (
  suggestionId: string,
  banknoteId: string,
  imageUrl: string,
  type: 'obverse' | 'reverse'
): Promise<boolean> => {
  try {
    // First, update the suggestion status to approved
    const { error: updateError } = await supabase
      .from('image_suggestions')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (updateError) {
      console.error('Error updating image suggestion status:', updateError);
      return false;
    }

    // Then, update the banknote image
    const updateColumn = type === 'obverse' ? 'front_picture' : 'back_picture';
    const { error: banknoteError } = await supabase
      .from('detailed_banknotes')
      .update({
        [updateColumn]: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', banknoteId);

    if (banknoteError) {
      console.error('Error updating banknote image:', banknoteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in approveImageSuggestion:', error);
    return false;
  }
};

// Reject an image suggestion
export const rejectImageSuggestion = async (
  suggestionId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('image_suggestions')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      console.error('Error rejecting image suggestion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in rejectImageSuggestion:', error);
    return false;
  }
};
