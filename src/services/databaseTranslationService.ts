import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

export interface TranslationField {
  originalField: string;
  arField: string;
  trField: string;
}

export interface TranslationConfig {
  table: string;
  idField: string;
  fields: TranslationField[];
}

export class DatabaseTranslationService {
  private static instance: DatabaseTranslationService;

  public static getInstance(): DatabaseTranslationService {
    if (!DatabaseTranslationService.instance) {
      DatabaseTranslationService.instance = new DatabaseTranslationService();
    }
    return DatabaseTranslationService.instance;
  }

  /**
   * Get localized content for a specific field
   * @param originalText - The original text (usually in English)
   * @param translatedText - The translated text (ar or tr)
   * @param currentLanguage - Current language context
   * @returns The appropriate text based on language
   */
  getLocalizedText(
    originalText: string,
    translatedText: string | null | undefined,
    currentLanguage: string
  ): string {
    if (currentLanguage === 'en' || !translatedText || translatedText.trim() === '') {
      return originalText;
    }
    return translatedText;
  }

  /**
   * Check if translation is needed for a field
   * @param originalText - Original text
   * @param translatedText - Translated text
   * @param targetLanguage - Target language
   * @returns boolean indicating if translation is needed
   */
  needsTranslation(
    originalText: string,
    translatedText: string | null | undefined,
    targetLanguage: string
  ): boolean {
    if (targetLanguage === 'en' || !originalText || originalText.trim() === '') {
      return false;
    }
    return !translatedText || translatedText.trim() === '';
  }

  /**
   * Translate and save a single field for a record
   * @param config - Translation configuration
   * @param recordId - Record ID to update
   * @param field - Field to translate
   * @param originalText - Original text to translate
   * @param targetLanguage - Target language ('ar' or 'tr')
   * @returns Promise<boolean> - Success status
   */
  async translateAndSaveField(
    config: TranslationConfig,
    recordId: string,
    field: TranslationField,
    originalText: string,
    targetLanguage: 'ar' | 'tr'
  ): Promise<boolean> {
    try {
      // Check if translation is needed
      if (!this.needsTranslation(originalText, null, targetLanguage)) {
        return true;
      }

      // Translate the text
      const translatedText = await translationService.translateText(
        originalText,
        targetLanguage,
        'en'
      );

      // Update the database
      const updateData: any = {};
      updateData[field[`${targetLanguage}Field`]] = translatedText;

      const { error } = await supabase
        .from(config.table)
        .update(updateData)
        .eq(config.idField, recordId);

      if (error) {
        console.error(`Error updating ${config.table} translation:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Translation and save failed:', error);
      return false;
    }
  }

  /**
   * Translate and save multiple fields for a record
   * @param config - Translation configuration
   * @param recordId - Record ID to update
   * @param record - Record data with original fields
   * @param targetLanguage - Target language ('ar' or 'tr')
   * @returns Promise<boolean> - Success status
   */
  async translateAndSaveRecord(
    config: TranslationConfig,
    recordId: string,
    record: any,
    targetLanguage: 'ar' | 'tr'
  ): Promise<boolean> {
    try {
      const updateData: any = {};

      // Process each field that needs translation
      for (const field of config.fields) {
        const originalText = record[field.originalField];
        
        if (this.needsTranslation(originalText, null, targetLanguage)) {
          const translatedText = await translationService.translateText(
            originalText,
            targetLanguage,
            'en'
          );
          updateData[field[`${targetLanguage}Field`]] = translatedText;
        }
      }

      // If no translations needed, return success
      if (Object.keys(updateData).length === 0) {
        return true;
      }

      // Update the database
      const { error } = await supabase
        .from(config.table)
        .update(updateData)
        .eq(config.idField, recordId);

      if (error) {
        console.error(`Error updating ${config.table} translations:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Batch translation and save failed:', error);
      return false;
    }
  }

  /**
   * Get localized record with automatic translation if needed
   * @param config - Translation configuration
   * @param record - Record data
   * @param currentLanguage - Current language
   * @param autoTranslate - Whether to automatically translate missing fields
   * @returns Promise<Record> - Localized record
   */
  async getLocalizedRecord(
    config: TranslationConfig,
    record: any,
    currentLanguage: string,
    autoTranslate: boolean = false
  ): Promise<any> {
    const localizedRecord = { ...record };

    for (const field of config.fields) {
      const originalText = record[field.originalField];
      const translatedText = record[field[`${currentLanguage === 'ar' ? 'ar' : 'tr'}Field`]];

      // Get the appropriate text
      localizedRecord[field.originalField] = this.getLocalizedText(
        originalText,
        translatedText,
        currentLanguage
      );

      // Auto-translate if needed and enabled
      if (autoTranslate && currentLanguage !== 'en' && this.needsTranslation(originalText, translatedText, currentLanguage)) {
        const targetLanguage = currentLanguage as 'ar' | 'tr';
        await this.translateAndSaveField(
          config,
          record[config.idField],
          field,
          originalText,
          targetLanguage
        );
        
        // Update the localized record with the new translation
        const newTranslatedText = await translationService.translateText(
          originalText,
          targetLanguage,
          'en'
        );
        localizedRecord[field.originalField] = newTranslatedText;
      }
    }

    return localizedRecord;
  }

  /**
   * Get localized records with automatic translation if needed
   * @param config - Translation configuration
   * @param records - Array of records
   * @param currentLanguage - Current language
   * @param autoTranslate - Whether to automatically translate missing fields
   * @returns Promise<Record[]> - Array of localized records
   */
  async getLocalizedRecords(
    config: TranslationConfig,
    records: any[],
    currentLanguage: string,
    autoTranslate: boolean = false
  ): Promise<any[]> {
    const localizedRecords = await Promise.all(
      records.map(record => this.getLocalizedRecord(config, record, currentLanguage, autoTranslate))
    );

    return localizedRecords;
  }
}

// Export singleton instance
export const databaseTranslationService = DatabaseTranslationService.getInstance();

/**
 * Create a translation configuration dynamically based on available fields
 * @param table - Table name
 * @param idField - ID field name
 * @param availableFields - Array of field names that exist in the table
 * @returns TranslationConfig
 */
export function createTranslationConfig(
  table: string,
  idField: string,
  availableFields: string[]
): TranslationConfig {
  const fields: TranslationField[] = [];

  // Check for name field translations
  if (availableFields.includes('name_ar') && availableFields.includes('name_tr')) {
    fields.push({
      originalField: 'name',
      arField: 'name_ar',
      trField: 'name_tr'
    });
  }

  // Check for description field translations
  if (availableFields.includes('description_ar') && availableFields.includes('description_tr')) {
    fields.push({
      originalField: 'description',
      arField: 'description_ar',
      trField: 'description_tr'
    });
  }

  // Check for title field translations
  if (availableFields.includes('title_ar') && availableFields.includes('title_tr')) {
    fields.push({
      originalField: 'title',
      arField: 'title_ar',
      trField: 'title_tr'
    });
  }

  // Check for content field translations
  if (availableFields.includes('content_ar') && availableFields.includes('content_tr')) {
    fields.push({
      originalField: 'content',
      arField: 'content_ar',
      trField: 'content_tr'
    });
  }

  return {
    table,
    idField,
    fields
  };
}

/**
 * Get table schema information to determine available fields
 * @param table - Table name
 * @returns Promise<string[]> - Array of available field names
 */
export async function getTableFields(table: string): Promise<string[]> {
  try {
    // Query the table with a limit of 1 to get schema information
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.error(`Error getting schema for table ${table}:`, error);
      return [];
    }

    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    return [];
  } catch (error) {
    console.error(`Error getting table fields for ${table}:`, error);
    return [];
  }
}

/**
 * Create translation configuration for a table dynamically
 * @param table - Table name
 * @param idField - ID field name (default: 'id')
 * @returns Promise<TranslationConfig>
 */
export async function createDynamicTranslationConfig(
  table: string,
  idField: string = 'id'
): Promise<TranslationConfig> {
  const availableFields = await getTableFields(table);
  return createTranslationConfig(table, idField, availableFields);
}

/**
 * Create a simple translation configuration for just the name field
 * @param table - Table name
 * @param idField - ID field name (default: 'id')
 * @returns TranslationConfig
 */
export function createNameTranslationConfig(
  table: string,
  idField: string = 'id'
): TranslationConfig {
  return {
    table,
    idField,
    fields: [
      {
        originalField: 'name',
        arField: 'name_ar',
        trField: 'name_tr'
      }
    ]
  };
}
