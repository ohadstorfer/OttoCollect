import { supabase } from '@/integrations/supabase/client';
import { banknoteTranslationService } from './banknoteTranslationService';

interface BulkTranslationProgress {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: number;
  currentBanknote?: string;
}

interface BulkTranslationResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  errors: string[];
}

export class BulkBanknoteTranslationService {
  static async processBulkTranslation(
    countryName: string,
    onProgress?: (progress: BulkTranslationProgress) => void
  ): Promise<BulkTranslationResult> {
    try {
      console.log(`🔄 [BulkTranslation] Starting bulk translation for country: ${countryName}`);
      
      // Step 1: Get all banknotes for the country
      const { data: banknotes, error: banknotesError } = await supabase
        .from('detailed_banknotes')
        .select('*')
        .eq('country', countryName)
        .eq('is_approved', true);

      if (banknotesError) {
        throw new Error(`Failed to fetch banknotes: ${banknotesError.message}`);
      }

      if (!banknotes?.length) {
        return {
          success: true,
          totalProcessed: 0,
          created: 0,
          updated: 0,
          errors: []
        };
      }

      console.log(`📊 [BulkTranslation] Found ${banknotes.length} banknotes to process`);

      // Step 2: Get existing translations
      const banknoteIds = banknotes.map(b => b.id);
      const { data: existingTranslations } = await supabase
        .from('banknotes_translation')
        .select('*')
        .in('banknote_id', banknoteIds)
        .eq('is_unlisted', false);

      // Create a map for faster lookup
      const translationMap = new Map();
      existingTranslations?.forEach(t => {
        translationMap.set(t.banknote_id, t);
      });

      const result: BulkTranslationResult = {
        success: true,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        errors: []
      };

      // Step 3: Process banknotes in batches to avoid overwhelming the API
      const BATCH_SIZE = 5;
      const batches = [];
      for (let i = 0; i < banknotes.length; i += BATCH_SIZE) {
        batches.push(banknotes.slice(i, i + BATCH_SIZE));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Process batch in parallel
        const batchPromises = batch.map(async (banknote) => {
          try {
            const existingTranslation = translationMap.get(banknote.id);
            const needsTranslation = this.checkIfTranslationNeeded(banknote, existingTranslation);
            
            if (needsTranslation.needed) {
              const sourceData = this.extractSourceData(banknote);
              
              // Translate to both Arabic and Turkish
              const [arResult, trResult] = await Promise.all([
                banknoteTranslationService.translateBanknoteFields(
                  banknote.id,
                  false,
                  'ar',
                  sourceData
                ),
                banknoteTranslationService.translateBanknoteFields(
                  banknote.id,
                  false,
                  'tr',
                  sourceData
                )
              ]);

              if (arResult && trResult) {
                if (existingTranslation) {
                  result.updated++;
                } else {
                  result.created++;
                }
                return { success: true, banknoteId: banknote.id };
              } else {
                throw new Error('Translation failed for one or more languages');
              }
            }
            
            return { success: true, banknoteId: banknote.id, skipped: true };
          } catch (error) {
            const errorMsg = `Failed to translate banknote ${banknote.extended_pick_number}: ${error}`;
            result.errors.push(errorMsg);
            return { success: false, banknoteId: banknote.id, error: errorMsg };
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        result.totalProcessed += batch.length;

        // Update progress
        if (onProgress) {
          const processed = (batchIndex + 1) * BATCH_SIZE;
          onProgress({
            total: banknotes.length,
            processed: Math.min(processed, banknotes.length),
            created: result.created,
            updated: result.updated,
            errors: result.errors.length,
            currentBanknote: batch[batch.length - 1]?.extended_pick_number
          });
        }

        // Small delay between batches to prevent overwhelming the API
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ [BulkTranslation] Completed. Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`);
      
      return result;
    } catch (error) {
      console.error('❌ [BulkTranslation] Fatal error:', error);
      return {
        success: false,
        totalProcessed: 0,
        created: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  private static checkIfTranslationNeeded(banknote: any, existingTranslation: any): { needed: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    if (!existingTranslation) {
      reasons.push('No translation record exists');
      return { needed: true, reasons };
    }

    // Fields that should be translated
    const translatableFields = [
      'country', 'face_value', 'islamic_year', 'seal_names', 
      'sultan_name', 'printer', 'type', 'category', 'security_element',
      'colors', 'banknote_description', 'historical_description', 'dimensions'
    ];

    // Check if any field is missing translation
    for (const field of translatableFields) {
      const sourceValue = banknote[field];
      if (sourceValue && typeof sourceValue === 'string' && sourceValue.trim()) {
        const arField = `${field}_ar`;
        const trField = `${field}_tr`;
        
        if (!existingTranslation[arField] || !existingTranslation[trField]) {
          reasons.push(`Missing ${field} translation`);
        }
      }
    }

    // Check array fields (signatures)
    const arrayFields = ['signatures_front', 'signatures_back'];
    for (const field of arrayFields) {
      const sourceValue = banknote[field];
      if (Array.isArray(sourceValue) && sourceValue.length > 0) {
        const arField = `${field}_ar`;
        const trField = `${field}_tr`;
        
        if (!existingTranslation[arField] || !existingTranslation[trField] ||
            !Array.isArray(existingTranslation[arField]) || !Array.isArray(existingTranslation[trField])) {
          reasons.push(`Missing ${field} translation`);
        }
      }
    }

    return { needed: reasons.length > 0, reasons };
  }

  private static extractSourceData(banknote: any): any {
    return {
      country: banknote.country,
      face_value: banknote.face_value,
      islamic_year: banknote.islamic_year,
      signatures_front: banknote.signatures_front,
      signatures_back: banknote.signatures_back,
      seal_names: banknote.seal_names,
      sultan_name: banknote.sultan_name,
      printer: banknote.printer,
      type: banknote.type,
      category: banknote.category,
      security_element: banknote.security_element,
      colors: banknote.colors,
      banknote_description: banknote.banknote_description,
      historical_description: banknote.historical_description,
      dimensions: banknote.dimensions
    };
  }
}

export const bulkBanknoteTranslationService = BulkBanknoteTranslationService;