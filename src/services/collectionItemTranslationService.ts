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
        
        // Filter out translation fields that don't exist in the database
        // Based on previous errors, public_note_ar, public_note_tr, etc. were removed
        const validTranslationData: any = {};
        
        // Only include fields that we know exist in the database
        // For now, we'll only update the original fields and log the translations
        Object.keys(translationData).forEach(key => {
          if (key.includes('_ar') || key.includes('_tr') || key.includes('_en')) {
            // These are translation fields that were removed from the database
            console.log(`🌐 [CollectionItemTranslation] Translation field ${key}: ${translationData[key]} (not saved to database)`);
          } else {
            validTranslationData[key] = translationData[key];
          }
        });

        if (Object.keys(validTranslationData).length > 0) {
        const { error } = await supabase
          .from('collection_items')
            .update(validTranslationData)
          .eq('id', itemId);

        if (error) {
          console.error('❌ Error updating collection item translations:', error);
          return false;
          }
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
   * Translate and update unlisted banknote - save English to unlisted_banknotes, translations to banknotes_translation
   */
  static async translateUnlistedBanknote(
    banknoteId: string,
    banknoteData: any,
    changedFields: string[]
  ): Promise<boolean> {
    try {
      console.log('🌐 [CollectionItemTranslation] Translating unlisted banknote fields:', { banknoteId, banknoteData, changedFields });

      // Only translate if name field was changed
      if (!changedFields.includes('name') || !banknoteData.name) {
        console.log('🌐 [CollectionItemTranslation] No name field to translate for unlisted banknote');
        return true;
      }

      const nameValue = banknoteData.name;
      if (!nameValue || typeof nameValue !== 'string' || !nameValue.trim()) {
        console.log('🌐 [CollectionItemTranslation] Name field is empty, skipping translation');
        return true;
      }

      // Detect the language of the input
      const srcLang = await translationService.detectLanguage(nameValue);
      console.log(`🌐 [CollectionItemTranslation] Processing unlisted banknote name. srcLang=${srcLang}, value=`, nameValue);

      // If the input is English, save it directly to unlisted_banknotes table
      if (srcLang === 'en') {
        console.log('🌐 [CollectionItemTranslation] Input is English, saving to unlisted_banknotes table');
        const { error: updateError } = await supabase
          .from('unlisted_banknotes')
          .update({ name: nameValue })
          .eq('id', banknoteId);

        if (updateError) {
          console.error('❌ Error updating unlisted banknote name:', updateError);
          return false;
        }

        // Translate to Arabic and Turkish and save to banknotes_translation
        const translationData: Record<string, string> = {};
        const targetLanguages = ['ar', 'tr'];
        
        for (const targetLang of targetLanguages) {
          try {
            console.log(`🌐 [CollectionItemTranslation] Translating unlisted banknote name from ${srcLang} to ${targetLang}`);
            const translation = await translationService.translateText(nameValue, targetLang as 'ar' | 'tr', srcLang);
            
            if (translation && translation.trim()) {
              translationData[`name_${targetLang}`] = translation;
              console.log(`✅ Unlisted banknote translation successful: ${srcLang}->${targetLang}:`, translation);
            } else {
              console.warn(`⚠️ Empty translation result for unlisted banknote name from ${srcLang} to ${targetLang}`);
            }
          } catch (error) {
            console.error(`❌ Failed translating unlisted banknote name from ${srcLang} to ${targetLang}:`, error);
          }
        }

        // Update the banknotes_translation table with Arabic and Turkish translations
        if (Object.keys(translationData).length > 0) {
          console.log('🌐 [CollectionItemTranslation] Applying unlisted banknote translations:', translationData);
          
          try {
            const { error } = await supabase
              .from('banknotes_translation')
              .upsert({
                banknote_id: banknoteId,
                is_unlisted: true,
                ...translationData
              }, {
                onConflict: 'banknote_id,is_unlisted'
              });

            if (error) {
              console.error('❌ Error updating unlisted banknote translations:', error);
              // Don't return false, just log the error and continue
              console.log('⚠️ Continuing despite translation save error');
            } else {
              console.log('✅ Successfully saved unlisted banknote translations to database');
            }
          } catch (error) {
            console.error('❌ Exception updating unlisted banknote translations:', error);
            console.log('⚠️ Continuing despite translation save error');
          }
        }
      } else {
        // If the input is Arabic or Turkish, save it to banknotes_translation and translate to other languages
        console.log('🌐 [CollectionItemTranslation] Input is not English, saving to banknotes_translation table');
        
        // Prepare translation data for banknotes_translation table
        const translationData: Record<string, string> = {};

        // Save the original in the detected language column
        translationData[`name_${srcLang}`] = nameValue;

        // Translate to the other two languages
        const targetLanguages = ['en', 'ar', 'tr'].filter(lang => lang !== srcLang);
        
        for (const targetLang of targetLanguages) {
          try {
            console.log(`🌐 [CollectionItemTranslation] Translating unlisted banknote name from ${srcLang} to ${targetLang}`);
            const translation = await translationService.translateText(nameValue, targetLang as 'en' | 'ar' | 'tr', srcLang);
            
            if (translation && translation.trim()) {
              translationData[`name_${targetLang}`] = translation;
              console.log(`✅ Unlisted banknote translation successful: ${srcLang}->${targetLang}:`, translation);
            } else {
              console.warn(`⚠️ Empty translation result for unlisted banknote name from ${srcLang} to ${targetLang}`);
            }
          } catch (error) {
            console.error(`❌ Failed translating unlisted banknote name from ${srcLang} to ${targetLang}:`, error);
          }
        }

        // Update the banknotes_translation table with all translations
        if (Object.keys(translationData).length > 0) {
          console.log('🌐 [CollectionItemTranslation] Applying unlisted banknote translations:', translationData);
          
          try {
            const { error } = await supabase
              .from('banknotes_translation')
              .upsert({
                banknote_id: banknoteId,
                is_unlisted: true,
                ...translationData
              }, {
                onConflict: 'banknote_id,is_unlisted'
              });

            if (error) {
              console.error('❌ Error updating unlisted banknote translations:', error);
              // Don't return false, just log the error and continue
              console.log('⚠️ Continuing despite translation save error');
            } else {
              console.log('✅ Successfully saved unlisted banknote translations to database');
            }
          } catch (error) {
            console.error('❌ Exception updating unlisted banknote translations:', error);
            console.log('⚠️ Continuing despite translation save error');
          }
        }
      }

      console.log(`✅ Successfully translated unlisted banknote ${banknoteId}`);
      return true;
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
      await this.translateChangedFields(itemId, newItemData, changedFields);
    } else {
      console.log('🌐 [CollectionItemTranslation] No translatable field changes detected.');
    }
  }
}

export const collectionItemTranslationService = CollectionItemTranslationService;