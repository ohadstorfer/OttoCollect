import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';

export interface BlogTranslationData {
  title?: string;
  title_ar?: string;
  title_tr?: string;
  title_en?: string;
  content?: string;
  content_ar?: string;
  content_tr?: string;
  content_en?: string;
  excerpt?: string;
  excerpt_ar?: string;
  excerpt_tr?: string;
  excerpt_en?: string;
}

export class BlogTranslationService {
  private static instance: BlogTranslationService;

  public static getInstance(): BlogTranslationService {
    if (!BlogTranslationService.instance) {
      BlogTranslationService.instance = new BlogTranslationService();
    }
    return BlogTranslationService.instance;
  }

  /**
   * Get the appropriate field name for the target language
   */
  private getTranslationField(baseField: string, targetLanguage: string): string {
    if (targetLanguage === 'en') return `${baseField}_en`;
    if (targetLanguage === 'ar') return `${baseField}_ar`;
    if (targetLanguage === 'tr') return `${baseField}_tr`;
    return baseField; // fallback to original field
  }

  /**
   * Get localized content for blog posts
   */
  getLocalizedContent(
    post: BlogTranslationData,
    currentLanguage: string
  ): { title: string; content: string; excerpt: string } {
    const titleField = this.getTranslationField('title', currentLanguage);
    const contentField = this.getTranslationField('content', currentLanguage);
    const excerptField = this.getTranslationField('excerpt', currentLanguage);

    return {
      title: post[titleField as keyof BlogTranslationData] || post.title || '',
      content: post[contentField as keyof BlogTranslationData] || post.content || '',
      excerpt: post[excerptField as keyof BlogTranslationData] || post.excerpt || ''
    };
  }

  /**
   * Check if translation exists for specific fields
   */
  hasTranslation(
    post: BlogTranslationData,
    targetLanguage: string
  ): { titleExists: boolean; contentExists: boolean; excerptExists: boolean } {
    const titleField = this.getTranslationField('title', targetLanguage);
    const contentField = this.getTranslationField('content', targetLanguage);
    const excerptField = this.getTranslationField('excerpt', targetLanguage);

    const titleExists = !!(post[titleField as keyof BlogTranslationData]);
    const contentExists = !!(post[contentField as keyof BlogTranslationData]);
    const excerptExists = !!(post[excerptField as keyof BlogTranslationData]);

    return { titleExists, contentExists, excerptExists };
  }

  /**
   * Translate blog post title, content and excerpt
   */
  async translatePost(
    postId: string,
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; translatedTitle?: string; translatedContent?: string; translatedExcerpt?: string }> {
    try {
      console.log('Translating blog post:', { postId, targetLanguage, sourceLanguage });

      // Fetch the current post data
      const { data: post, error: fetchError } = await supabase
        .from('blog_posts')
        .select('title, content, excerpt, title_ar, title_tr, title_en, content_ar, content_tr, content_en, excerpt_ar, excerpt_tr, excerpt_en')
        .eq('id', postId)
        .single();

      if (fetchError) {
        console.error('Error fetching post for translation:', fetchError);
        return { success: false };
      }

      if (!post) {
        console.error('Post not found for translation');
        return { success: false };
      }

      // Check what needs translation
      const titleField = this.getTranslationField('title', targetLanguage);
      const contentField = this.getTranslationField('content', targetLanguage);
      const excerptField = this.getTranslationField('excerpt', targetLanguage);

      const titleExists = !!(post[titleField]);
      const contentExists = !!(post[contentField]);
      const excerptExists = !!(post[excerptField]);

      // If all already exist, return existing translations
      if (titleExists && contentExists && excerptExists) {
        return {
          success: true,
          translatedTitle: post[titleField],
          translatedContent: post[contentField],
          translatedExcerpt: post[excerptField]
        };
      }

      // Translate what's missing
      const updateData: any = {};
      let translatedTitle = post[titleField];
      let translatedContent = post[contentField];
      let translatedExcerpt = post[excerptField];

      if (!titleExists && post.title) {
        translatedTitle = await translationService.translateText(post.title, targetLanguage, sourceLanguage);
        updateData[titleField] = translatedTitle;
      }

      if (!contentExists && post.content) {
        translatedContent = await translationService.translateText(post.content, targetLanguage, sourceLanguage);
        updateData[contentField] = translatedContent;
      }

      if (!excerptExists && post.excerpt) {
        translatedExcerpt = await translationService.translateText(post.excerpt, targetLanguage, sourceLanguage);
        updateData[excerptField] = translatedExcerpt;
      }

      // Update database with new translations
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          console.error('Error updating translations:', updateError);
          return { success: false };
        }
      }

      return {
        success: true,
        translatedTitle,
        translatedContent,
        translatedExcerpt
      };
    } catch (error) {
      console.error('Error in translatePost:', error);
      return { success: false };
    }
  }

  /**
   * Translate blog comment content
   */
  async translateComment(
    commentId: string,
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; translatedContent?: string }> {
    try {
      console.log('Translating blog comment:', { commentId, targetLanguage, sourceLanguage });

      // Fetch the current comment data
      const { data: comment, error: fetchError } = await supabase
        .from('blog_comments')
        .select('content, content_ar, content_tr, content_en')
        .eq('id', commentId)
        .single();

      if (fetchError) {
        console.error('Error fetching comment for translation:', fetchError);
        return { success: false };
      }

      if (!comment) {
        console.error('Comment not found for translation');
        return { success: false };
      }

      // Check if translation already exists
      const contentField = this.getTranslationField('content', targetLanguage);
      const existingTranslation = comment[contentField];

      if (existingTranslation) {
        return {
          success: true,
          translatedContent: existingTranslation
        };
      }

      // Translate the content
      const translatedContent = await translationService.translateText(
        comment.content,
        targetLanguage,
        sourceLanguage
      );

      // Update database with new translation
      const updateData = {
        [contentField]: translatedContent
      };

      const { error: updateError } = await supabase
        .from('blog_comments')
        .update(updateData)
        .eq('id', commentId);

      if (updateError) {
        console.error('Error updating comment translation:', updateError);
        return { success: false };
      }

      return {
        success: true,
        translatedContent
      };
    } catch (error) {
      console.error('Error in translateComment:', error);
      return { success: false };
    }
  }

  /**
   * Save original content to appropriate language field when creating posts
   */
  async detectAndSaveOriginalLanguage(
    title: string,
    content: string,
    excerpt: string,
    postId: string
  ): Promise<void> {
    try {
      // Simple language detection - in a real app you might use a proper language detection service
      const hasArabicChars = /[\u0600-\u06FF]/.test(title + content + excerpt);
      const hasTurkishChars = /[çğıöşüÇĞIİÖŞÜ]/.test(title + content + excerpt);

      let detectedLanguage = 'en'; // default to English
      if (hasArabicChars) {
        detectedLanguage = 'ar';
      } else if (hasTurkishChars) {
        detectedLanguage = 'tr';
      }

      // If not English, save to the appropriate language field
      if (detectedLanguage !== 'en') {
        const titleField = this.getTranslationField('title', detectedLanguage);
        const contentField = this.getTranslationField('content', detectedLanguage);
        const excerptField = this.getTranslationField('excerpt', detectedLanguage);

        const updateData = {
          [titleField]: title,
          [contentField]: content,
          [excerptField]: excerpt
        };

        await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);
      } else {
        // For English, save to the _en fields as well
        const updateData = {
          title_en: title,
          content_en: content,
          excerpt_en: excerpt
        };

        await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error detecting and saving original language:', error);
    }
  }
}

// Export singleton instance
export const blogTranslationService = BlogTranslationService.getInstance();