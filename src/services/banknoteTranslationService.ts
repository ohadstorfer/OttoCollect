import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

interface BanknoteTranslationData {
  banknote_id: string;
  is_unlisted: boolean;
  country_ar?: string;
  country_tr?: string;
  face_value_ar?: string;
  face_value_tr?: string;
  islamic_year_ar?: string;
  islamic_year_tr?: string;
  signatures_front_ar?: string[];
  signatures_front_tr?: string[];
  signatures_back_ar?: string[];
  signatures_back_tr?: string[];
  seal_names_ar?: string;
  seal_names_tr?: string;
  sultan_name_ar?: string;
  sultan_name_tr?: string;
  printer_ar?: string;
  printer_tr?: string;
  type_ar?: string;
  type_tr?: string;
  category_ar?: string;
  category_tr?: string;
  security_element_ar?: string;
  security_element_tr?: string;
  colors_ar?: string;
  colors_tr?: string;
  banknote_description_ar?: string;
  banknote_description_tr?: string;
  historical_description_ar?: string;
  historical_description_tr?: string;
  dimensions_ar?: string;
  dimensions_tr?: string;
  name_ar?: string; // For unlisted banknotes only
  name_tr?: string; // For unlisted banknotes only
}

export class BanknoteTranslationService {
  // Translate banknote fields to a specific language
  static async translateBanknoteFields(
    banknoteId: string,
    isUnlisted: boolean,
    targetLanguage: 'ar' | 'tr',
    sourceData: any
  ): Promise<boolean> {
    try {
      console.log(`🔄 [BanknoteTranslationService] Starting translation for banknote ${banknoteId} to ${targetLanguage}`);

      // Get existing translation record
      const { data: existingTranslation } = await supabase
        .from('banknotes_translation')
        .select('*')
        .eq('banknote_id', banknoteId)
        .eq('is_unlisted', isUnlisted)
        .maybeSingle();

      const translationData: Partial<BanknoteTranslationData> = {
        banknote_id: banknoteId,
        is_unlisted: isUnlisted,
      };

      // List of fields to translate
      const fieldsToTranslate = [
        'country',
        'face_value',
        'islamic_year',
        'seal_names',
        'sultan_name',
        'printer',
        'type',
        'category',
        'security_element',
        'colors',
        'banknote_description',
        'historical_description',
        'dimensions'
      ];

      // Add name field for unlisted banknotes
      if (isUnlisted) {
        fieldsToTranslate.push('name');
      }

      // Translate each field
      for (const field of fieldsToTranslate) {
        const sourceValue = sourceData[field];
        if (sourceValue && typeof sourceValue === 'string' && sourceValue.trim()) {
          try {
            const translatedValue = await translationService.translateText(sourceValue, targetLanguage);
            if (translatedValue) {
              const fieldKey = `${field}_${targetLanguage}` as keyof BanknoteTranslationData;
              (translationData as any)[fieldKey] = translatedValue;
            }
          } catch (error) {
            console.warn(`⚠️ [BanknoteTranslationService] Failed to translate ${field}:`, error);
          }
        }
      }

      // Handle array fields (signatures)
      const arrayFields = ['signatures_front', 'signatures_back'];
      for (const field of arrayFields) {
        const sourceValue = sourceData[field];
        if (Array.isArray(sourceValue) && sourceValue.length > 0) {
          try {
            const translatedArray = await Promise.all(
              sourceValue.map(item => 
                typeof item === 'string' ? translationService.translateText(item, targetLanguage) : item
              )
            );
            const fieldKey = `${field}_${targetLanguage}` as keyof BanknoteTranslationData;
            (translationData as any)[fieldKey] = translatedArray.filter(Boolean);
          } catch (error) {
            console.warn(`⚠️ [BanknoteTranslationService] Failed to translate ${field}:`, error);
          }
        }
      }

      // Use UPSERT to handle both insert and update cases
      const { error } = await supabase
        .from('banknotes_translation')
        .upsert(translationData, {
          onConflict: 'banknote_id,is_unlisted',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ [BanknoteTranslationService] Error upserting translation:', error);
        return false;
      }

      console.log(`✅ [BanknoteTranslationService] Successfully translated banknote ${banknoteId} to ${targetLanguage}`);
      return true;
    } catch (error) {
      console.error('❌ [BanknoteTranslationService] Translation failed:', error);
      return false;
    }
  }

  // Get translated fields for a specific language
  static async getTranslatedBanknote(
    banknoteId: string,
    isUnlisted: boolean,
    language: string
  ): Promise<any> {
    try {
      const viewName = isUnlisted 
        ? 'unlisted_banknotes_with_translations'
        : 'enhanced_banknotes_with_translations';

      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .eq('id', banknoteId)
        .maybeSingle();

      if (error) {
        console.error('❌ [BanknoteTranslationService] Error fetching translated banknote:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Return the appropriate translated fields based on language
      if (language === 'ar' || language === 'tr') {
        return this.mapTranslatedFields(data, language);
      }

      return data;
    } catch (error) {
      console.error('❌ [BanknoteTranslationService] Error getting translated banknote:', error);
      return null;
    }
  }

  // Map translated fields based on language
  private static mapTranslatedFields(data: any, language: 'ar' | 'tr'): any {
    const mappedData = { ...data };

    const fieldsToMap = [
      'country',
      'face_value',
      'islamic_year',
      'seal_names',
      'sultan_name',
      'printer',
      'type',
      'category',
      'security_element',
      'colors',
      'banknote_description',
      'historical_description',
      'dimensions',
      'name' // For unlisted banknotes
    ];

    fieldsToMap.forEach(field => {
      const translatedField = `${field}_${language}`;
      if (data[translatedField]) {
        mappedData[field] = data[translatedField];
      }
    });

    // Handle array fields
    ['signatures_front', 'signatures_back'].forEach(field => {
      const translatedField = `${field}_${language}`;
      if (data[translatedField]) {
        mappedData[field] = data[translatedField];
      }
    });

    return mappedData;
  }

  // Auto-translate a banknote to all supported languages
  static async autoTranslateBanknote(
    banknoteId: string,
    isUnlisted: boolean,
    sourceData: any
  ): Promise<{ success: boolean; languages: string[] }> {
    const results = await Promise.all([
      this.translateBanknoteFields(banknoteId, isUnlisted, 'ar', sourceData),
      this.translateBanknoteFields(banknoteId, isUnlisted, 'tr', sourceData)
    ]);

    const successfulLanguages = [];
    if (results[0]) successfulLanguages.push('ar');
    if (results[1]) successfulLanguages.push('tr');

    return {
      success: successfulLanguages.length > 0,
      languages: successfulLanguages
    };
  }
}

export const banknoteTranslationService = BanknoteTranslationService;