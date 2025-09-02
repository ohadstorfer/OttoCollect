import { supabase } from '@/integrations/supabase/client';

interface TranslationRequest {
  text: string;
  targetLanguage: 'ar' | 'tr' | 'en';
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
  // Detect language of text using Google Translate API
  async detectLanguage(text: string): Promise<'ar' | 'tr' | 'en'> {
    if (!text || text.trim() === '') {
      return 'en';
    }

    try {
      console.log(`🔍 [TranslationService] Detecting language for text: "${text.substring(0, 50)}..."`);
      
      // Use the Edge Function's language detection endpoint
      const { data, error } = await supabase.functions.invoke('translate-content/detect', {
        body: { text: text.trim() }
      });

      if (error) {
        console.error('❌ Language detection error:', error);
        // Fallback to simple detection if API fails
        return translationService.fallbackLanguageDetection(text);
      }

      if (data.error) {
        console.error('❌ Language detection API error:', data.error);
        return translationService.fallbackLanguageDetection(text);
      }

      const detectedLanguage = data.detectedLanguage;
      const confidence = data.confidence;
      
      console.log(`✅ [TranslationService] Language detected: ${detectedLanguage} (confidence: ${confidence})`);

      // Map Google Translate language codes to our supported languages
      switch (detectedLanguage) {
        case 'ar':
          return 'ar';
        case 'tr':
          return 'tr';
        case 'en':
        default:
          return 'en';
      }
    } catch (error) {
      console.error('❌ Language detection request failed:', error);
      // Fallback to simple detection if request fails
      return translationService.fallbackLanguageDetection(text);
    }
  },

  // Fallback language detection using character patterns (for when API fails)
  fallbackLanguageDetection(text: string): 'ar' | 'tr' | 'en' {
    console.log('🔄 [TranslationService] Using fallback language detection');
    
    // Simple language detection based on character patterns
    // Arabic: Unicode range for Arabic characters
    const arabicPattern = /[\u0600-\u06FF]/;
    
    // Turkish: Only the specific Turkish characters that don't exist in English
    // Exclude 'I' and 'i' as they exist in English and can cause false positives
    const turkishPattern = /[çğıöşüÇĞÖŞÜ]/;
    
    if (arabicPattern.test(text)) {
      return 'ar';
    } else if (turkishPattern.test(text)) {
      return 'tr';
    } else {
      return 'en';
    }
  },
  // Translate text using Google Translate API
  async translateText(text: string, targetLanguage: 'ar' | 'tr' | 'en', sourceLanguage: string = 'en'): Promise<string> {
    if (!text || text.trim() === '') {
      return text;
    }

    console.log(`🔍 [TranslationService] Attempting translation: "${text}" from ${sourceLanguage} to ${targetLanguage}`);

    try {
      console.log(`🔍 [TranslationService] Invoking Edge Function with:`, {
        text: text.trim(),
        targetLanguage,
        sourceLanguage
      });
      
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          text: text.trim(),
          targetLanguage,
          sourceLanguage
        }
      });

      console.log(`🔍 [TranslationService] Edge function response:`, { data, error });

      if (error) {
        console.error('❌ Translation service error:', error);
        return text; // Return original text on error
      }

      if (data.error) {
        console.error('❌ Translation API error:', data.error);
        return text; // Return original text on error
      }

      const translatedText = data.translatedText || text;
      console.log(`✅ [TranslationService] Translation result: "${text}" → "${translatedText}"`);
      
      return translatedText;
    } catch (error) {
      console.error('❌ Translation request failed:', error);
      return text; // Return original text on error
    }
  },

  // Translate multiple texts in batch
  async translateBatch(texts: string[], targetLanguage: 'ar' | 'tr' | 'en', sourceLanguage: string = 'en'): Promise<string[]> {
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