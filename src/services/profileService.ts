
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

export async function fetchUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        rank,
        avatar_url,
        email,
        role_id,
        role,
        points,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    if (!data) {
      console.log(`No user profile found with ID: ${userId}`);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      rank: data.rank,
      avatarUrl: data.avatar_url,
      email: data.email,
      role_id: data.role_id,
      role: data.role,
      points: data.points,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Unexpected error in fetchUserProfile:', error);
    return null;
  }
}

// Add missing exports
export async function updateUserProfile(userId: string, updates: {
  username?: string;
  about?: string;
  country?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        about: updates.about,
        country: updates.country,
        updated_at: new Date().toISOString()
      })
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    // This is a placeholder since we don't have the actual supabase storage setup
    // const { error } = await supabase.storage
    //   .from('avatars')
    //   .upload(filePath, file);
    
    // if (error) {
    //   console.error('Error uploading avatar:', error);
    //   return null;
    // }
    
    // const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    // return data.publicUrl;
    
    // For now, return a placeholder
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
  } catch (error) {
    console.error('Unexpected error in uploadAvatar:', error);
    return null;
  }
}

export function getUserProfile(userId: string) {
  return fetchUserProfile(userId);
}
