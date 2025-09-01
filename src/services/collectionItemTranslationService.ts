import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';
import { banknoteTranslationService } from './banknoteTranslationService';

interface CollectionItemTranslationData {
  private_note_ar?: string;
  private_note_tr?: string;
  location_ar?: string;
  location_tr?: string;
  type_ar?: string;
  type_tr?: string;
}

interface ChangedFields {
  private_note?: boolean;
  location?: boolean;
  type?: boolean;
}

export class CollectionItemTranslationService {
  /**
   * Detect which fields have changed by comparing old and new values
   */
  static detectChangedFields(oldItem: any, newItem: any): ChangedFields {
    const changed: ChangedFields = {};
    
    if (oldItem.private_note !== newItem.private_note) {
      changed.private_note = true;
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

      // List of fields to translate with their target languages
      const fieldsToTranslate = [
        { field: 'private_note', changed: changedFields.private_note },
        { field: 'location', changed: changedFields.location },
        { field: 'type', changed: changedFields.type }
      ];

      // Translate each changed field
      for (const { field, changed } of fieldsToTranslate) {
        if (!changed || !newItemData[field] || typeof newItemData[field] !== 'string' || !newItemData[field].trim()) {
          continue;
        }

        try {
          // Translate to Arabic and Turkish
          const [arTranslation, trTranslation] = await Promise.all([
            translationService.translateText(newItemData[field], 'ar'),
            translationService.translateText(newItemData[field], 'tr')
          ]);

          if (arTranslation) {
            translationData[`${field}_ar` as keyof CollectionItemTranslationData] = arTranslation;
          }
          if (trTranslation) {
            translationData[`${field}_tr` as keyof CollectionItemTranslationData] = trTranslation;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to translate ${field}:`, error);
        }
      }

      // Update the collection item with translations if any were generated
      if (Object.keys(translationData).length > 0) {
        const { error } = await supabase
          .from('collection_items')
          .update(translationData)
          .eq('id', itemId);

        if (error) {
          console.error('❌ Error updating collection item translations:', error);
          return false;
        }

        console.log(`✅ Successfully translated collection item ${itemId}`);
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
    if (changedFields.private_note || changedFields.location || changedFields.type) {
      await this.translateChangedFields(itemId, newItemData, changedFields);
    }
  }
}

export const collectionItemTranslationService = CollectionItemTranslationService;