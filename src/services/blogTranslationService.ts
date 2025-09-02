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
   * Translate blog post title and content (matching forum service exactly)
   */
  async translatePost(
    postId: string,
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage?: string
  ): Promise<{ success: boolean; translatedTitle?: string; translatedContent?: string; translatedExcerpt?: string }> {
    try {
      console.log('🌐 [BlogTranslation] Translating blog post:', { postId, targetLanguage, sourceLanguage });

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

      // Check what needs translation (matching forum service logic)
      const titleField = this.getTranslationField('title', targetLanguage);
      const contentField = this.getTranslationField('content', targetLanguage);

      const titleExists = !!(post[titleField]);
      const contentExists = !!(post[contentField]);

      // If both title and content already exist, return existing translations (matching forum logic)
      if (titleExists && contentExists) {
        console.log('🌐 [BlogTranslation] Title and content translations already exist, returning cached versions');
        return {
          success: true,
          translatedTitle: post[titleField],
          translatedContent: post[contentField],
          translatedExcerpt: post.excerpt // Use original excerpt for now
        };
      }

      // Translate what's missing
      const updateData: any = {};
      let translatedTitle = post[titleField];
      let translatedContent = post[contentField];

      if (!titleExists && post.title) {
        // Detect the original language of the title if not provided
        const detectedTitleLang = sourceLanguage || await translationService.detectLanguage(post.title);
        console.log(`🌐 [BlogTranslation] Title language detected: ${detectedTitleLang}`);
        
        // Save original title to its language field if not already there
        if (detectedTitleLang !== 'en') {
          const originalTitleField = this.getTranslationField('title', detectedTitleLang);
          if (!post[originalTitleField]) {
            updateData[originalTitleField] = post.title;
          }
        }

        // Translate title to target language
        translatedTitle = await translationService.translateText(post.title, targetLanguage, detectedTitleLang);
        updateData[titleField] = translatedTitle;
        console.log(`🌐 [BlogTranslation] Title translated from ${detectedTitleLang} to ${targetLanguage}`);
      }

      if (!contentExists && post.content) {
        // Detect the original language of the content if not provided
        const detectedContentLang = sourceLanguage || await translationService.detectLanguage(post.content);
        console.log(`🌐 [BlogTranslation] Content language detected: ${detectedContentLang}`);
        
        // Save original content to its language field if not already there
        if (detectedContentLang !== 'en') {
          const originalContentField = this.getTranslationField('content', detectedContentLang);
          if (!post[originalContentField]) {
            updateData[originalContentField] = post.content;
          }
        }

        // Translate content to target language
        translatedContent = await translationService.translateText(post.content, targetLanguage, detectedContentLang);
        updateData[contentField] = translatedContent;
        console.log(`🌐 [BlogTranslation] Content translated from ${detectedContentLang} to ${targetLanguage}`);
      }

      // Update database with new translations
      if (Object.keys(updateData).length > 0) {
        console.log('🌐 [BlogTranslation] Updating database with translations:', updateData);
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          console.error('Error updating translations:', updateError);
          return { success: false };
        }
        console.log('🌐 [BlogTranslation] Database updated successfully');
      }

      return {
        success: true,
        translatedTitle,
        translatedContent,
        translatedExcerpt: post.excerpt // Use original excerpt for now
      };
    } catch (error) {
      console.error('Error in translatePost:', error);
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
      console.log('🌐 [BlogTranslation] Detecting and saving original language for:', { postId });

      // Use the translation service's language detection
      const titleLang = await translationService.detectLanguage(title);
      const contentLang = await translationService.detectLanguage(content);
      const excerptLang = await translationService.detectLanguage(excerpt);

      console.log(`🌐 [BlogTranslation] Detected languages - Title: ${titleLang}, Content: ${contentLang}, Excerpt: ${excerptLang}`);

      const updateData: any = {};

      // Save title to appropriate language field
      if (titleLang !== 'en') {
        const titleField = this.getTranslationField('title', titleLang);
        updateData[titleField] = title;
        console.log(`🌐 [BlogTranslation] Saving title to ${titleField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.title_en = title;
        console.log(`🌐 [BlogTranslation] Saving English title to title_en`);
      }

      // Save content to appropriate language field
      if (contentLang !== 'en') {
        const contentField = this.getTranslationField('content', contentLang);
        updateData[contentField] = content;
        console.log(`🌐 [BlogTranslation] Saving content to ${contentField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.content_en = content;
        console.log(`🌐 [BlogTranslation] Saving English content to content_en`);
      }

      // Save excerpt to appropriate language field
      if (excerptLang !== 'en') {
        const excerptField = this.getTranslationField('excerpt', excerptLang);
        updateData[excerptField] = excerpt;
        console.log(`🌐 [BlogTranslation] Saving excerpt to ${excerptField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.excerpt_en = excerpt;
        console.log(`🌐 [BlogTranslation] Saving English excerpt to excerpt_en`);
      }

      // Determine the primary original language (use content language as primary)
      const primaryLanguage = contentLang;
      updateData.original_language = primaryLanguage;
      console.log(`🌐 [BlogTranslation] Saving original_language: ${primaryLanguage}`);

      // Update the database
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          console.error('Error saving original language data:', updateError);
        } else {
          console.log('🌐 [BlogTranslation] Original language data saved successfully');
        }
      }
    } catch (error) {
      console.error('Error detecting and saving original language:', error);
    }
  }

  /**
   * Translate blog comment content with smart language detection (matching forum service exactly)
   */
  async translateComment(
    commentId: string,
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage?: string
  ): Promise<{ success: boolean; translatedContent?: string }> {
    try {
      console.log('🌐 [BlogTranslation] Translating comment:', { commentId, targetLanguage, sourceLanguage });

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
        console.log('🌐 [BlogTranslation] Comment translation already exists, returning cached version');
        return {
          success: true,
          translatedContent: existingTranslation
        };
      }

      // Detect the original language of the content if not provided
      const detectedContentLang = sourceLanguage || await translationService.detectLanguage(comment.content);
      console.log(`🌐 [BlogTranslation] Comment content language detected: ${detectedContentLang}`);

      // Save original content to its language field if not already there
      if (detectedContentLang !== 'en') {
        const originalContentField = this.getTranslationField('content', detectedContentLang);
        if (!comment[originalContentField]) {
          const updateData = {
            [originalContentField]: comment.content
          };

          await supabase
            .from('blog_comments')
            .update(updateData)
            .eq('id', commentId);

          console.log(`🌐 [BlogTranslation] Saved original comment content to ${originalContentField}`);
        }
      }

      // Translate the content to target language
      const translatedContent = await translationService.translateText(
        comment.content,
        targetLanguage,
        detectedContentLang
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

      console.log(`🌐 [BlogTranslation] Comment translated from ${detectedContentLang} to ${targetLanguage}`);

      return {
        success: true,
        translatedContent
      };
    } catch (error) {
      console.error('Error in translateComment:', error);
      return { success: false };
    }
  }
}

// Export singleton instance
export const blogTranslationService = BlogTranslationService.getInstance();