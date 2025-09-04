import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

export interface CollectionItemTranslationData {
  public_note?: string;
  public_note_ar?: string;
  public_note_tr?: string;
  public_note_en?: string;
  public_note_original_language?: string;
}

export class CollectionItemTranslationService {
  private static instance: CollectionItemTranslationService;

  public static getInstance(): CollectionItemTranslationService {
    if (!CollectionItemTranslationService.instance) {
      CollectionItemTranslationService.instance = new CollectionItemTranslationService();
    }
    return CollectionItemTranslationService.instance;
  }

  /**
   * Get the appropriate field name for the target language
   */
  private getTranslationField(baseField: string, targetLanguage: string): string {
    if (targetLanguage === 'en') return `${baseField}_en`;
    if (targetLanguage === 'ar') return `${baseField}_ar`;
    if (targetLanguage === 'tr') return `${baseField}_tr`;
    return baseField; // fallback to original field
  }

  /**
   * Get localized content for collection item public note
   */
  getLocalizedContent(
    item: CollectionItemTranslationData,
    currentLanguage: string
  ): { publicNote: string } {
    const publicNoteField = this.getTranslationField('public_note', currentLanguage);

    return {
      publicNote: item[publicNoteField as keyof CollectionItemTranslationData] || item.public_note || ''
    };
  }

  /**
   * Check if translation exists for public note
   */
  hasTranslation(
    item: CollectionItemTranslationData,
    targetLanguage: string
  ): { publicNoteExists: boolean } {
    const publicNoteField = this.getTranslationField('public_note', targetLanguage);

    const publicNoteExists = !!(item[publicNoteField as keyof CollectionItemTranslationData]);

    return { publicNoteExists };
  }

  /**
   * Translate collection item public note
   */
  async translatePublicNote(
    itemId: string,
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage?: string
  ): Promise<{ success: boolean; translatedPublicNote?: string }> {
    try {
      console.log('🌐 [CollectionItemTranslation] Translating public note:', { itemId, targetLanguage, sourceLanguage });

      // Fetch the current item data
      const { data: item, error: fetchError } = await supabase
        .from('collection_items')
        .select('public_note, public_note_ar, public_note_tr, public_note_en, public_note_original_language')
        .eq('id', itemId)
        .single();

      if (fetchError) {
        console.error('Error fetching item for translation:', fetchError);
        return { success: false };
      }

      if (!item) {
        console.error('Item not found for translation');
        return { success: false };
      }

      // Check if translation already exists
      const publicNoteField = this.getTranslationField('public_note', targetLanguage);
      const existingTranslation = item[publicNoteField];

      if (existingTranslation) {
        console.log('🌐 [CollectionItemTranslation] Translation already exists, returning cached version');
        return {
          success: true,
          translatedPublicNote: existingTranslation
        };
      }

      // Detect the original language of the public note if not provided
      const detectedPublicNoteLang = sourceLanguage || item.public_note_original_language || await translationService.detectLanguage(item.public_note);
      console.log(`🌐 [CollectionItemTranslation] Public note language detected: ${detectedPublicNoteLang}`);

      // Save original public note to its language field if not already there
      if (detectedPublicNoteLang !== 'en') {
        const originalPublicNoteField = this.getTranslationField('public_note', detectedPublicNoteLang);
        if (!item[originalPublicNoteField]) {
          const updateData = {
            [originalPublicNoteField]: item.public_note,
            public_note_original_language: detectedPublicNoteLang
          };

          await supabase
            .from('collection_items')
            .update(updateData)
            .eq('id', itemId);

          console.log(`🌐 [CollectionItemTranslation] Saved original public note to ${originalPublicNoteField}`);
        }
      } else {
        // For English, save to the _en field and set original language
        if (!item.public_note_en) {
          const updateData = {
            public_note_en: item.public_note,
            public_note_original_language: 'en'
          };

          await supabase
            .from('collection_items')
            .update(updateData)
            .eq('id', itemId);

          console.log(`🌐 [CollectionItemTranslation] Saved English public note to public_note_en`);
        }
      }

      // Translate the public note to target language
      const translatedPublicNote = await translationService.translateText(
        item.public_note,
        targetLanguage,
        detectedPublicNoteLang
      );

      // Update database with new translation
      const updateData = {
        [publicNoteField]: translatedPublicNote
      };

      const { error: updateError } = await supabase
        .from('collection_items')
        .update(updateData)
        .eq('id', itemId);

      if (updateError) {
        console.error('Error updating public note translation:', updateError);
        return { success: false };
      }

      console.log(`🌐 [CollectionItemTranslation] Public note translated from ${detectedPublicNoteLang} to ${targetLanguage}`);

      return {
        success: true,
        translatedPublicNote
      };
    } catch (error) {
      console.error('Error in translatePublicNote:', error);
      return { success: false };
    }
  }

  /**
   * Save original content to appropriate language field when creating/updating items
   */
  async detectAndSaveOriginalLanguage(
    publicNote: string,
    itemId: string
  ): Promise<void> {
    try {
      console.log('🌐 [CollectionItemTranslation] Detecting and saving original language for:', { itemId });

      if (!publicNote || !publicNote.trim()) {
        console.log('🌐 [CollectionItemTranslation] No public note to process');
        return;
      }

      // Use the translation service's language detection
      const publicNoteLang = await translationService.detectLanguage(publicNote);

      console.log(`🌐 [CollectionItemTranslation] Detected language - Public Note: ${publicNoteLang}`);

      const updateData: any = {};

      // Save public note to appropriate language field
      if (publicNoteLang !== 'en') {
        const publicNoteField = this.getTranslationField('public_note', publicNoteLang);
        updateData[publicNoteField] = publicNote;
        console.log(`🌐 [CollectionItemTranslation] Saving public note to ${publicNoteField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.public_note_en = publicNote;
        console.log(`🌐 [CollectionItemTranslation] Saving English public note to public_note_en`);
      }

      // Set the original language
      updateData.public_note_original_language = publicNoteLang;
      console.log(`🌐 [CollectionItemTranslation] Saving public_note_original_language: ${publicNoteLang}`);

      // Translate to the other two languages
      const targetLanguages = ['en', 'ar', 'tr'].filter(lang => lang !== publicNoteLang);
      
      for (const targetLang of targetLanguages) {
        try {
          console.log(`🌐 [CollectionItemTranslation] Translating public note from ${publicNoteLang} to ${targetLang}`);
          const translation = await translationService.translateText(publicNote, targetLang as 'en' | 'ar' | 'tr', publicNoteLang);
          
          if (translation && translation.trim()) {
            const targetField = this.getTranslationField('public_note', targetLang);
            updateData[targetField] = translation;
            console.log(`✅ Translation successful: ${publicNoteLang}->${targetLang}:`, translation);
          } else {
            console.warn(`⚠️ Empty translation result for public note from ${publicNoteLang} to ${targetLang}`);
          }
        } catch (error) {
          console.error(`❌ Failed translating public note from ${publicNoteLang} to ${targetLang}:`, error);
        }
      }

      // Update the database with all translations
      if (Object.keys(updateData).length > 0) {
        console.log('🌐 [CollectionItemTranslation] Updating database with translations:', updateData);
        const { error: updateError } = await supabase
          .from('collection_items')
          .update(updateData)
          .eq('id', itemId);

        if (updateError) {
          console.error('Error saving original language data:', updateError);
        } else {
          console.log('🌐 [CollectionItemTranslation] Original language data and translations saved successfully');
        }
      }
    } catch (error) {
      console.error('Error detecting and saving original language:', error);
    }
  }

  /**
   * Check if an item has translations in all languages
   */
  async hasCompleteTranslations(
    itemId: string
  ): Promise<boolean> {
    try {
      const translations = await this.getAllTranslations(itemId);
      if (!translations) return false;

      // Check if we have public note in all three languages
      const hasPublicNoteInAll = !!(translations.public_note_ar && translations.public_note_tr && translations.public_note_en);

      return hasPublicNoteInAll;
    } catch (error) {
      console.error('Error checking complete translations:', error);
      return false;
    }
  }

  /**
   * Get all translations for an item
   */
  async getAllTranslations(itemId: string): Promise<CollectionItemTranslationData | null> {
    try {
      const { data, error } = await supabase
        .from('collection_items')
        .select('public_note, public_note_ar, public_note_tr, public_note_en, public_note_original_language')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching translations:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getAllTranslations:', error);
      return null;
    }
  }

  /**
   * Handle translation for collection item update (legacy method for other fields)
   */
  static async handleCollectionItemUpdate(
    itemId: string,
    oldItemData: any,
    newItemData: any
  ): Promise<void> {
    // This method is kept for backward compatibility with location and type fields
    // Public note translation is now handled separately with detectAndSaveOriginalLanguage
    console.log('🌐 [CollectionItemTranslation] Legacy handleCollectionItemUpdate called - this should only be used for non-public_note fields');
  }

  /**
   * Translate unlisted banknote (legacy method)
   */
  static async translateUnlistedBanknote(
    banknoteId: string,
    banknoteData: any,
    changedFields: string[]
  ): Promise<boolean> {
    // This method is kept for backward compatibility
    console.log('🌐 [CollectionItemTranslation] Legacy translateUnlistedBanknote called');
    return true;
  }
}

// Export singleton instance
export const collectionItemTranslationService = CollectionItemTranslationService.getInstance();