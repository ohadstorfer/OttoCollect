import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';
import { banknoteTranslationService } from './banknoteTranslationService';

interface CollectionItemTranslationData {
  public_note_ar?: string;
  public_note_tr?: string;
  public_note_en?: string;
  location_ar?: string;
  location_tr?: string;
  location_en?: string;
  type_ar?: string;
  type_tr?: string;
  type_en?: string;
}

interface ChangedFields {
  public_note?: boolean;
  location?: boolean;
  type?: boolean;
}



export class CollectionItemTranslationService {
  /**
   * Detect which fields have changed by comparing old and new values
   */
  static detectChangedFields(oldItem: any, newItem: any): ChangedFields {
    const changed: ChangedFields = {};

    if (oldItem.public_note !== newItem.public_note) {
      changed.public_note = true;
    }
    if (oldItem.location !== newItem.location) {
      changed.location = true;
    }
    if (oldItem.type !== newItem.type) {
      changed.type = true;
    }

    return changed;
  }

  /**
   * Translate and update collection item fields
   */
  static async translateChangedFields(
    itemId: string,
    newItemData: any,
    changedFields: ChangedFields
  ): Promise<boolean> {
    try {
      const translationData: CollectionItemTranslationData = {};

      // Fields eligible for translation
      const fieldsToTranslate: Array<{ field: 'public_note' | 'location' | 'type'; changed?: boolean }> = [
        { field: 'public_note', changed: changedFields.public_note },
        { field: 'location', changed: changedFields.location },
        { field: 'type', changed: changedFields.type }
      ];

      console.log('🌐 [CollectionItemTranslation] Changed fields:', changedFields);

      for (const { field, changed } of fieldsToTranslate) {
        const value = newItemData[field];
        if (!changed || !value || typeof value !== 'string' || !value.trim()) {
          continue;
        }

        const srcLang = await translationService.detectLanguage(value);
        console.log(`🌐 [CollectionItemTranslation] Processing field "${field}". srcLang=${srcLang}, value=`, value);

        // Always save the original in the detected language column
        (translationData as any)[`${field}_${srcLang}`] = value;

        // Translate to the other two languages
        const targetLanguages = ['en', 'ar', 'tr'].filter(lang => lang !== srcLang);
        
        for (const targetLang of targetLanguages) {
          try {
            console.log(`🌐 [CollectionItemTranslation] Translating "${field}" from ${srcLang} to ${targetLang}`);
            const translation = await translationService.translateText(value, targetLang as 'en' | 'ar' | 'tr', srcLang);
            
            if (translation && translation.trim()) {
              (translationData as any)[`${field}_${targetLang}`] = translation;
              console.log(`✅ Translation successful: ${srcLang}->${targetLang}:`, translation);
            } else {
              console.warn(`⚠️ Empty translation result for ${field} from ${srcLang} to ${targetLang}`);
            }
          } catch (error) {
            console.error(`❌ Failed translating ${field} from ${srcLang} to ${targetLang}:`, error);
          }
        }
      }

      // Update the collection item with translations if any were generated
      if (Object.keys(translationData).length > 0) {
        console.log('🌐 [CollectionItemTranslation] Applying translations:', translationData);
        const { error } = await supabase
          .from('collection_items')
          .update(translationData)
          .eq('id', itemId);

        if (error) {
          console.error('❌ Error updating collection item translations:', error);
          return false;
        }

        console.log(`✅ Successfully translated collection item ${itemId}`);
      } else {
        console.log('🌐 [CollectionItemTranslation] No translations to apply.');
      }

      return true;
    } catch (error) {
      console.error('❌ Collection item translation failed:', error);
      return false;
    }
  }

  /**
   * Translate and update unlisted banknote in banknotes_translation table
   */
  static async translateUnlistedBanknote(
    banknoteId: string,
    banknoteData: any,
    changedFields: string[]
  ): Promise<boolean> {
    try {
      // Only translate if name field was changed
      if (!changedFields.includes('name') || !banknoteData.name) {
        return true;
      }

      return await banknoteTranslationService.translateBanknoteFields(
        banknoteId,
        true, // is_unlisted
        'ar',
        banknoteData
      ) && await banknoteTranslationService.translateBanknoteFields(
        banknoteId,
        true, // is_unlisted
        'tr',
        banknoteData
      );
    } catch (error) {
      console.error('❌ Unlisted banknote translation failed:', error);
      return false;
    }
  }

  /**
   * Handle translation for collection item update
   */
  static async handleCollectionItemUpdate(
    itemId: string,
    oldItemData: any,
    newItemData: any
  ): Promise<void> {
    const changedFields = this.detectChangedFields(oldItemData, newItemData);

    // Only proceed if there are changed translatable fields
    if (changedFields.public_note || changedFields.location || changedFields.type) {
      console.log('🌐 [CollectionItemTranslation] Translating changed fields for item:', itemId);
      
      // Test Edge Function first
      console.log('🧪 [CollectionItemTranslation] Testing Edge Function before translation...');
      const testResult = await translationService.testEdgeFunction();
      console.log('🧪 [CollectionItemTranslation] Edge Function test result:', testResult);
      
      await this.translateChangedFields(itemId, newItemData, changedFields);
    } else {
      console.log('🌐 [CollectionItemTranslation] No translatable field changes detected.');
    }
  }
}

export const collectionItemTranslationService = CollectionItemTranslationService;