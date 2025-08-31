import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

export interface ProfileTranslationResult {
  success: boolean;
  translatedContent?: string;
  error?: string;
}

class ProfileTranslationService {
  private static instance: ProfileTranslationService;

  private constructor() {}

  public static getInstance(): ProfileTranslationService {
    if (!ProfileTranslationService.instance) {
      ProfileTranslationService.instance = new ProfileTranslationService();
    }
    return ProfileTranslationService.instance;
  }

  /**
   * Translate and save the about field for a user profile
   */
  async translateAbout(
    userId: string,
    targetLanguage: 'ar' | 'tr',
    sourceLanguage: 'en' = 'en'
  ): Promise<ProfileTranslationResult> {
    try {
      console.log('🔄 [ProfileTranslationService] Starting about translation:', {
        userId,
        targetLanguage,
        sourceLanguage
      });

      // First, check if translation already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('about, about_ar, about_tr')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ [ProfileTranslationService] Error fetching profile:', fetchError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      if (!existingProfile?.about) {
        console.log('ℹ️ [ProfileTranslationService] No about content to translate');
        return { success: false, error: 'No about content to translate' };
      }

      // Check if translation already exists
      const translationField = targetLanguage === 'ar' ? 'about_ar' : 'about_tr';
      if (existingProfile[translationField]) {
        console.log('✅ [ProfileTranslationService] Translation already exists:', {
          userId,
          targetLanguage,
          existingTranslation: existingProfile[translationField]
        });
        return {
          success: true,
          translatedContent: existingProfile[translationField]
        };
      }

      // Translate the about content
      console.log('🌐 [ProfileTranslationService] Translating about content...');
      const translationResult = await translationService.translateText(
        existingProfile.about,
        sourceLanguage,
        targetLanguage
      );

      if (!translationResult.success || !translationResult.translatedText) {
        console.error('❌ [ProfileTranslationService] Translation failed:', translationResult.error);
        return { success: false, error: translationResult.error || 'Translation failed' };
      }

      // Save the translation to the database
      const updateData = {
        [translationField]: translationResult.translatedText
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ [ProfileTranslationService] Error saving translation:', updateError);
        return { success: false, error: 'Failed to save translation' };
      }

      console.log('✅ [ProfileTranslationService] About translated and saved successfully:', {
        userId,
        targetLanguage,
        translatedContent: translationResult.translatedText
      });

      return {
        success: true,
        translatedContent: translationResult.translatedText
      };
    } catch (error) {
      console.error('❌ [ProfileTranslationService] Unexpected error:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Get the localized about content for a user profile
   */
  async getLocalizedAbout(
    userId: string,
    targetLanguage: 'en' | 'ar' | 'tr'
  ): Promise<ProfileTranslationResult> {
    try {
      console.log('🔍 [ProfileTranslationService] Getting localized about:', {
        userId,
        targetLanguage
      });

      // Fetch the profile with all about fields
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('about, about_ar, about_tr')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('❌ [ProfileTranslationService] Error fetching profile:', fetchError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      if (!profile?.about) {
        console.log('ℹ️ [ProfileTranslationService] No about content found');
        return { success: false, error: 'No about content found' };
      }

      // Return the appropriate language version
      if (targetLanguage === 'en') {
        return { success: true, translatedContent: profile.about };
      } else if (targetLanguage === 'ar' && profile.about_ar) {
        return { success: true, translatedContent: profile.about_ar };
      } else if (targetLanguage === 'tr' && profile.about_tr) {
        return { success: true, translatedContent: profile.about_tr };
      }

      // If translation doesn't exist, translate it
      console.log('🔄 [ProfileTranslationService] Translation needed, starting translation...');
      return await this.translateAbout(userId, targetLanguage);
    } catch (error) {
      console.error('❌ [ProfileTranslationService] Unexpected error:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }
}

export const profileTranslationService = ProfileTranslationService.getInstance();
