import { User, UserRank } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export const fetchUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Return a properly formatted User object with all required properties
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    role: data.role || "User",
    role_id: data.role_id || "", // Add the missing role_id
    rank: data.rank as UserRank,
    points: data.points,
    avatarUrl: data.avatar_url,
    about: data.about || "",
    country: data.country || "",
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

export async function updateUserProfile(
  userId: string,
  updates: { about?: string | null; username?: string }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
      return false;
    }

    toast.success("Profile updated successfully");
    return true;
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    toast.error("Failed to update profile");
    return false;
  }
}

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string | null> {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    // Upload the file to Supabase storage
    const { error: uploadError, data } = await supabase.storage
      .from('profile_pictures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      toast.error("Failed to upload avatar");
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
      toast.error("Failed to update avatar");
      return null;
    }

    return avatarUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    toast.error("Failed to upload avatar");
    return null;
  }
}
