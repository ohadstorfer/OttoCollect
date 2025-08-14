import { supabase } from "@/integrations/supabase/client";
import { User, UserRole, UserRank } from "@/types";
import heic2any from 'heic2any';

// Helper function to convert HEIC files to JPEG
async function convertHeicToJpeg(file: File): Promise<File> {
  // Check if the file is HEIC
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    console.log('Converting HEIC file to JPEG using heic2any...');
    
    try {
      // Convert HEIC to JPEG using heic2any library
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 1
      });
      
      // Create a new file with JPEG extension
      const jpegFile = new File([convertedBlob as Blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      console.log('HEIC conversion successful:', {
        originalName: file.name,
        convertedName: jpegFile.name,
        originalSize: file.size,
        convertedSize: jpegFile.size
      });
      
      return jpegFile;
    } catch (error) {
      console.error('Error converting HEIC:', error);
      throw new Error('Failed to convert HEIC image. Please try a JPEG or PNG file instead.');
    }
  }
  
  // If not HEIC, return the original file
  return file;
}

// Get a user profile by ID or username
export async function getUserProfile(userIdOrUsername: string): Promise<User | null> {
  try {
    // Check if the input is empty
    if (!userIdOrUsername) {
      console.error("Error fetching user profile: No userId or username provided");
      return null;
    }

    // First try to find by ID if it looks like a UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let query;
    if (uuidPattern.test(userIdOrUsername)) {
      // Query by ID
      query = supabase
        .from("profiles")
        .select("*")
        .eq("id", userIdOrUsername);
    } else {
      // Query by username
      query = supabase
        .from("profiles")
        .select("*")
        .eq("username", userIdOrUsername);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    if (!data) return null;

    const userProfile: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: data.role as UserRole,
      role_id: data.role_id || "", // Add the missing role_id property
      rank: data.rank as UserRank,
      points: data.points,
      createdAt: data.created_at,
      avatarUrl: data.avatar_url,
      ...(data.country && { country: data.country }),
      ...(data.about && { about: data.about }),
      ...(data.facebook_url && { facebook_url: data.facebook_url }),
      ...(data.instagram_url && { instagram_url: data.instagram_url }),
      ...(data.twitter_url && { twitter_url: data.twitter_url }),
      ...(data.linkedin_url && { linkedin_url: data.linkedin_url }),
    };

    return userProfile;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

// Update a user's profile
export async function updateUserProfile(
  userId: string,
  updates: { 
    about?: string | null; 
    username?: string;
    facebook_url?: string | null;
    instagram_url?: string | null;
    twitter_url?: string | null;
    linkedin_url?: string | null;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    return false;
  }
}

// Upload a new avatar image
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string | null> {
  try {
    console.log('🔍 [profileService] uploadAvatar called with:', {
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    // Convert HEIC files to JPEG
    console.log('🔄 [profileService] Starting HEIC conversion...');
    const convertedFile = await convertHeicToJpeg(file);
    console.log('✅ [profileService] HEIC conversion completed:', {
      originalName: file.name,
      convertedName: convertedFile.name,
      convertedType: convertedFile.type
    });

    // Create a unique file name
    const fileExt = convertedFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload the file to Supabase storage using profile_pictures bucket
    const { error: uploadError, data } = await supabase.storage
      .from('profile_pictures')
      .upload(fileName, convertedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('profile_pictures')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Update the user's profile with the new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating avatar URL:", updateError);
      return null;
    }

    console.log('✅ [profileService] Avatar URL updated successfully in database');

    return avatarUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return null;
  }
}

// Block a user by email
export async function blockUserByEmail(email: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocked_emails')
      .insert([{ email }]);
    if (error) {
      console.error('Error blocking user email:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in blockUserByEmail:', error);
    return false;
  }
}

// Delete a user by ID (also deletes Auth user via edge function)
export async function deleteUserById(userId: string): Promise<boolean> {
  try {
    // 1. Delete profile from profiles table
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    // 2. Call edge function to delete the Supabase Auth user
    // eslint-disable-next-line no-undef
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const supabaseEdgeUrl = '/functions/v1/delete-auth-user';

    const res = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, serviceKey }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Failed to delete Auth user:", txt);
      console.error('Deleted profile row, but failed to delete authentication user.');
      return false;
    }

    console.log('User removed and blocked successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteUserById:', error);
    return false;
  }
}
