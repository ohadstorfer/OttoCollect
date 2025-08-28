import { supabase } from '@/integrations/supabase/client';

interface TranslationRequest {
  text: string;
  targetLanguage: 'ar' | 'tr';
  sourceLanguage?: string;
}

interface TranslationResponse {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  sourceLanguage: string;
  success?: boolean;
  error?: string;
}

export const translationService = {
  // Translate text using Google Translate API
  async translateText(text: string, targetLanguage: 'ar' | 'tr', sourceLanguage: string = 'en'): Promise<string> {
    if (!text || text.trim() === '') {
      return text;
    }

    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          text: text.trim(),
          targetLanguage,
          sourceLanguage
        }
      });

      if (error) {
        console.error('Translation service error:', error);
        return text; // Return original text on error
      }

      if (data.error) {
        console.error('Translation API error:', data.error);
        return text; // Return original text on error
      }

      return data.translatedText || text;
    } catch (error) {
      console.error('Translation request failed:', error);
      return text; // Return original text on error
    }
  },

  // Translate multiple texts in batch
  async translateBatch(texts: string[], targetLanguage: 'ar' | 'tr', sourceLanguage: string = 'en'): Promise<string[]> {
    const promises = texts.map(text => this.translateText(text, targetLanguage, sourceLanguage));
    return Promise.all(promises);
  },

  // Get translation for content with fallback to original
  getTranslatedContent(
    originalText: string,
    translatedText: string | null | undefined,
    fallbackText?: string
  ): string {
    if (translatedText && translatedText.trim() !== '') {
      return translatedText;
    }
    return fallbackText || originalText || '';
  },

  // Check if translation is needed
  needsTranslation(originalText: string, translatedText: string | null | undefined): boolean {
    if (!originalText || originalText.trim() === '') {
      return false;
    }
    return !translatedText || translatedText.trim() === '';
  },

  // Auto-translate content for database updates
  async autoTranslateContent(content: { 
    title?: string;
    content?: string;
    description?: string;
    name?: string;
  }): Promise<{
    title_ar?: string;
    title_tr?: string;
    content_ar?: string;
    content_tr?: string;
    description_ar?: string;
    description_tr?: string;
    name_ar?: string;
    name_tr?: string;
  }> {
    const translations: any = {};

    // Translate title
    if (content.title) {
      translations.title_ar = await this.translateText(content.title, 'ar');
      translations.title_tr = await this.translateText(content.title, 'tr');
    }

    // Translate content
    if (content.content) {
      translations.content_ar = await this.translateText(content.content, 'ar');
      translations.content_tr = await this.translateText(content.content, 'tr');
    }

    // Translate description
    if (content.description) {
      translations.description_ar = await this.translateText(content.description, 'ar');
      translations.description_tr = await this.translateText(content.description, 'tr');
    }

    // Translate name
    if (content.name) {
      translations.name_ar = await this.translateText(content.name, 'ar');
      translations.name_tr = await this.translateText(content.name, 'tr');
    }

    return translations;
  }
};