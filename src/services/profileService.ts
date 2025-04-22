
import { supabase } from '@/integrations/supabase/client';
import { User, UserRank } from '@/types';

// Export the getUserProfile function
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!data) {
      console.log(`No profile found for user ID: ${userId}`);
      return null;
    }
    
    // Map database fields to our User type
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      about: data.about || '',
      country: data.country || '',
      role_id: data.role_id || '',
      role: data.role || 'User',
      rank: data.rank as UserRank, 
      points: data.points,
      createdAt: data.created_at,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    console.error('Unexpected error in getUserProfile:', error);
    return null;
  }
}

// Add the missing functions needed by ProfileEditForm
export async function updateUserProfile(userId: string, updates: {
  username?: string;
  about?: string | null;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in updateUserProfile:', error);
    return false;
  }
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // Upload the file
    const { error: uploadError } = await supabase
      .storage
      .from('user-images')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }
    
    // Get the public URL
    const { data } = supabase
      .storage
      .from('user-images')
      .getPublicUrl(filePath);
    
    // Update the user's profile with the new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating profile with avatar URL:', updateError);
      return null;
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected error in uploadAvatar:', error);
    return null;
  }
}
