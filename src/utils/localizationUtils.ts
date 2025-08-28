import { databaseTranslationService, TranslationConfig, createDynamicTranslationConfig } from '@/services/databaseTranslationService';

/**
 * Utility function to get localized text for any field
 * @param originalText - Original text (usually English)
 * @param translatedText - Translated text (ar or tr)
 * @param currentLanguage - Current language
 * @returns Localized text
 */
export function getLocalizedText(
  originalText: string,
  translatedText: string | null | undefined,
  currentLanguage: string
): string {
  return databaseTranslationService.getLocalizedText(originalText, translatedText, currentLanguage);
}

/**
 * Utility function to check if translation is needed
 * @param originalText - Original text
 * @param translatedText - Translated text
 * @param targetLanguage - Target language
 * @returns boolean indicating if translation is needed
 */
export function needsTranslation(
  originalText: string,
  translatedText: string | null | undefined,
  targetLanguage: string
): boolean {
  return databaseTranslationService.needsTranslation(originalText, translatedText, targetLanguage);
}

/**
 * Utility function to translate and save a single field
 * @param config - Translation configuration
 * @param recordId - Record ID
 * @param field - Field to translate
 * @param originalText - Original text
 * @param targetLanguage - Target language
 * @returns Promise<boolean> - Success status
 */
export async function translateAndSaveField(
  config: TranslationConfig,
  recordId: string,
  field: any,
  originalText: string,
  targetLanguage: 'ar' | 'tr'
): Promise<boolean> {
  return databaseTranslationService.translateAndSaveField(
    config,
    recordId,
    field,
    originalText,
    targetLanguage
  );
}

/**
 * Utility function to get localized record
 * @param config - Translation configuration
 * @param record - Record data
 * @param currentLanguage - Current language
 * @param autoTranslate - Whether to auto-translate missing fields
 * @returns Promise<Record> - Localized record
 */
export async function getLocalizedRecord(
  config: TranslationConfig,
  record: any,
  currentLanguage: string,
  autoTranslate: boolean = false
): Promise<any> {
  return databaseTranslationService.getLocalizedRecord(
    config,
    record,
    currentLanguage,
    autoTranslate
  );
}

/**
 * Utility function to get localized records
 * @param config - Translation configuration
 * @param records - Array of records
 * @param currentLanguage - Current language
 * @param autoTranslate - Whether to auto-translate missing fields
 * @returns Promise<Record[]> - Array of localized records
 */
export async function getLocalizedRecords(
  config: TranslationConfig,
  records: any[],
  currentLanguage: string,
  autoTranslate: boolean = false
): Promise<any[]> {
  return databaseTranslationService.getLocalizedRecords(
    config,
    records,
    currentLanguage,
    autoTranslate
  );
}

/**
 * Create dynamic translation configuration for any table
 * @param table - Table name
 * @param idField - ID field name (default: 'id')
 * @returns Promise<TranslationConfig>
 */
export async function createTranslationConfig(
  table: string,
  idField: string = 'id'
): Promise<TranslationConfig> {
  return createDynamicTranslationConfig(table, idField);
}

/**
 * Example usage for different tables:
 * 
 * // For countries
 * const config = await createTranslationConfig('countries', 'id');
 * const localizedCountry = await getLocalizedRecord(
 *   config,
 *   countryData,
 *   currentLanguage,
 *   true // auto-translate
 * );
 * 
 * // For categories
 * const categoriesConfig = await createTranslationConfig('banknote_category_definitions', 'id');
 * const localizedCategories = await getLocalizedRecords(
 *   categoriesConfig,
 *   categoriesData,
 *   currentLanguage,
 *   true // auto-translate
 * );
 * 
 * // For types
 * const typesConfig = await createTranslationConfig('banknote_type_definitions', 'id');
 * const localizedTypes = await getLocalizedRecords(
 *   typesConfig,
 *   typesData,
 *   currentLanguage,
 *   true // auto-translate
 * );
 */
