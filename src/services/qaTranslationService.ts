import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

type Lang = 'ar' | 'tr' | 'en';
const BASE_FIELDS = ['headline', 'short_description', 'content'] as const;

const fieldFor = (base: string, lang: string): string =>
  lang === 'en' ? `${base}_en` : lang === 'ar' ? `${base}_ar` : lang === 'tr' ? `${base}_tr` : base;

class QaTranslationService {
  private static instance: QaTranslationService;
  static getInstance(): QaTranslationService {
    if (!QaTranslationService.instance) QaTranslationService.instance = new QaTranslationService();
    return QaTranslationService.instance;
  }

  /**
   * Translate an entry's headline/short_description/content into the target
   * language, caching results in the *_<lang> columns. Returns the localized
   * trio (existing translation if already present).
   */
  async translateEntry(
    entryId: string,
    targetLanguage: Lang,
    sourceLanguage?: string
  ): Promise<{ success: boolean; headline?: string; shortDescription?: string; content?: string }> {
    try {
      const selectCols = ['headline', 'short_description', 'content']
        .flatMap((b) => [b, `${b}_en`, `${b}_ar`, `${b}_tr`])
        .join(', ');
      const { data: entry, error } = await supabase
        .from('qa_entries')
        .select(selectCols)
        .eq('id', entryId)
        .single();
      if (error || !entry) {
        console.error('Error fetching qa entry for translation:', error);
        return { success: false };
      }

      const updateData: Record<string, string> = {};
      const result: Record<string, string> = {};

      for (const base of BASE_FIELDS) {
        const targetField = fieldFor(base, targetLanguage);
        const existing = (entry as any)[targetField];
        const original = (entry as any)[base] as string;
        if (existing) {
          result[base] = existing;
          continue;
        }
        if (!original) {
          result[base] = '';
          continue;
        }
        const detected = sourceLanguage || (await translationService.detectLanguage(original));
        if (detected !== 'en') {
          const origField = fieldFor(base, detected);
          if (!(entry as any)[origField]) updateData[origField] = original;
        }
        const translated = await translationService.translateText(original, targetLanguage, detected);
        updateData[targetField] = translated;
        result[base] = translated;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('qa_entries')
          .update(updateData)
          .eq('id', entryId);
        if (updateError) {
          console.error('Error caching qa translations:', updateError);
          return { success: false };
        }
      }

      return {
        success: true,
        headline: result.headline,
        shortDescription: result.short_description,
        content: result.content,
      };
    } catch (e) {
      console.error('Error in translateEntry:', e);
      return { success: false };
    }
  }
}

export const qaTranslationService = QaTranslationService.getInstance();
