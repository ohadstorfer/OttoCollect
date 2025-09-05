import { supabase } from "@/integrations/supabase/client";
import { User, UserRole, UserRank } from "@/types";
import heic2any from 'heic2any';
import { translationService } from '@/services/translationService';

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
export async function getUserProfile(userIdOrUsername: string, currentLanguage?: string, shouldTranslateAbout: boolean = false): Promise<User | null> {
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

    // Handle role translation for country admins
    let localizedRole = data.role;
    if (data.role && data.role !== 'Super Admin' && data.role.includes('Admin')) {
      // This is a country admin, check for translations
      // Use the passed currentLanguage parameter or fallback to localStorage
      let detectedLanguage = currentLanguage || localStorage.getItem('i18nextLng') || 'en';
      
      // Also check for other possible language storage keys if not provided
      if (detectedLanguage === 'en') {
        detectedLanguage = localStorage.getItem('i18nextLng') || 
                         localStorage.getItem('language') || 
                         localStorage.getItem('currentLanguage') || 
                         localStorage.getItem('i18n') || 
                         'en';
      }
      
      console.log('🌐 [profileService] Language detection:', {
        i18nextLng: localStorage.getItem('i18nextLng'),
        language: localStorage.getItem('language'),
        currentLanguage: localStorage.getItem('currentLanguage'),
        i18n: localStorage.getItem('i18n'),
        finalLanguage: currentLanguage
      });
      console.log('🔍 [profileService] Role translation check:', {
        userId: data.id,
        originalRole: data.role,
        detectedLanguage,
        hasRoleAr: !!data.role_ar,
        hasRoleTr: !!data.role_tr,
        roleAr: data.role_ar,
        roleTr: data.role_tr
      });
      
      if (detectedLanguage === 'ar' && data.role_ar) {
        localizedRole = data.role_ar;
        console.log('✅ [profileService] Using Arabic role translation:', data.role_ar);
      } else if (detectedLanguage === 'tr' && data.role_tr) {
        localizedRole = data.role_tr;
        console.log('✅ [profileService] Using Turkish role translation:', data.role_tr);
      }
      
      // Auto-translate if translation is missing
      if ((detectedLanguage === 'ar' && !data.role_ar) || (detectedLanguage === 'tr' && !data.role_tr)) {
        console.log('🔄 [profileService] Starting auto-translation for role:', {
          userId: data.id,
          originalRole: data.role,
          targetLanguage: detectedLanguage
        });
        // Translate and save role in background
        translateAndSaveRole(data.id, data.role, detectedLanguage as 'ar' | 'tr').catch(console.error);
      } else {
        console.log('ℹ️ [profileService] No translation needed or already exists');
      }
    }

    // Handle about field translation - only when explicitly requested
    let localizedAbout = data.about;
    if (shouldTranslateAbout && data.about && currentLanguage && currentLanguage !== 'en') {
      console.log('🔍 [profileService] About translation check:', {
        userId: data.id,
        hasAbout: !!data.about,
        currentLanguage,
        hasAboutAr: !!data.about_ar,
        hasAboutTr: !!data.about_tr
      });
      
      if (currentLanguage === 'ar' && data.about_ar) {
        localizedAbout = data.about_ar;
        console.log('✅ [profileService] Using Arabic about translation:', data.about_ar);
      } else if (currentLanguage === 'tr' && data.about_tr) {
        localizedAbout = data.about_tr;
        console.log('✅ [profileService] Using Turkish about translation:', data.about_tr);
      }
      
      // Auto-translate if translation is missing
      if ((currentLanguage === 'ar' && !data.about_ar) || (currentLanguage === 'tr' && !data.about_tr)) {
        console.log('🔄 [profileService] Starting auto-translation for about:', {
          userId: data.id,
          targetLanguage: currentLanguage
        });
        // Import and use profileTranslationService to translate about in background
        import('./profileTranslationService').then(({ profileTranslationService }) => {
          profileTranslationService.translateAbout(data.id, currentLanguage as 'ar' | 'tr').catch(console.error);
        });
      } else {
        console.log('ℹ️ [profileService] About translation already exists');
      }
    }

    const userProfile: User = {
      id: data.id,
      username: data.username,
      email: data.email,
      role: localizedRole as UserRole,
      originalRole: data.role as UserRole, // Add original role for admin detection
      role_id: data.role_id || "", // Add the missing role_id property
      rank: data.rank as UserRank,
      points: data.points,
      createdAt: data.created_at,
      avatarUrl: data.avatar_url,
      selected_language: data.selected_language,
      ...(data.country && { country: data.country }),
      ...(localizedAbout && { about: localizedAbout }),
      ...(data.about_ar && { about_ar: data.about_ar }),
      ...(data.about_tr && { about_tr: data.about_tr }),
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
    selected_language?: string;
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

    // Update the user's profile with the new avatar URL using our image management service
    const { updateProfileAvatar } = await import('./imageManagementService');
    
    try {
      // Get current avatar to clean up old one
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      
      await updateProfileAvatar(userId, currentProfile?.avatar_url || null, avatarUrl);
    } catch (updateError) {
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

// Helper function to translate and save role
export async function translateAndSaveRole(userId: string, originalRole: string, targetLanguage: 'ar' | 'tr'): Promise<void> {
  try {
    console.log('🚀 [translateAndSaveRole] Starting translation:', {
      userId,
      originalRole,
      targetLanguage
    });
    
    if (!originalRole || originalRole === 'Super Admin') {
      console.log('⏭️ [translateAndSaveRole] Skipping translation for Super Admin or empty role');
      return; // Don't translate super admin role
    }

    console.log('🌐 [translateAndSaveRole] Calling translation service...');
    const translatedRole = await translationService.translateText(originalRole, targetLanguage, 'en');
    console.log('📝 [translateAndSaveRole] Translation result:', translatedRole);
    
    if (translatedRole && translatedRole !== originalRole) {
      const updateField = targetLanguage === 'ar' ? 'role_ar' : 'role_tr';
      console.log('💾 [translateAndSaveRole] Saving to database:', {
        userId,
        field: updateField,
        translatedRole
      });
      
      const { error } = await supabase
        .from('profiles')
        .update({ [updateField]: translatedRole })
        .eq('id', userId);
        
      if (error) {
        console.error('❌ [translateAndSaveRole] Error saving translated role:', error);
      } else {
        console.log(`✅ [translateAndSaveRole] Role translated and saved: ${originalRole} -> ${translatedRole} (${targetLanguage})`);
      }
    } else {
      console.log('⚠️ [translateAndSaveRole] No translation needed or translation failed');
    }
  } catch (error) {
    console.error('❌ [translateAndSaveRole] Error in translateAndSaveRole:', error);
  }
}
