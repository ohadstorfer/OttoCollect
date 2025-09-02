import { supabase } from '@/integrations/supabase/client';
import { translationService } from './translationService';
import { databaseTranslationService, createTranslationConfig } from './databaseTranslationService';

export interface ForumTranslationData {
  title?: string;
  title_ar?: string;
  title_tr?: string;
  title_en?: string;
  content?: string;
  content_ar?: string;
  content_tr?: string;
  content_en?: string;
}

export class ForumTranslationService {
  private static instance: ForumTranslationService;

  public static getInstance(): ForumTranslationService {
    if (!ForumTranslationService.instance) {
      ForumTranslationService.instance = new ForumTranslationService();
    }
    return ForumTranslationService.instance;
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
   * Get localized content for forum posts/announcements
   */
  getLocalizedContent(
    post: ForumTranslationData,
    currentLanguage: string
  ): { title: string; content: string } {
    const titleField = this.getTranslationField('title', currentLanguage);
    const contentField = this.getTranslationField('content', currentLanguage);

    return {
      title: post[titleField as keyof ForumTranslationData] || post.title || '',
      content: post[contentField as keyof ForumTranslationData] || post.content || ''
    };
  }

  /**
   * Check if translation exists for specific fields
   */
  hasTranslation(
    post: ForumTranslationData,
    targetLanguage: string
  ): { titleExists: boolean; contentExists: boolean } {
    const titleField = this.getTranslationField('title', targetLanguage);
    const contentField = this.getTranslationField('content', targetLanguage);

    const titleExists = !!(post[titleField as keyof ForumTranslationData]);
    const contentExists = !!(post[contentField as keyof ForumTranslationData]);

    return { titleExists, contentExists };
  }

  /**
   * Translate forum post title and content
   */
  async translatePost(
    postId: string,
    postType: 'forum_posts' | 'forum_announcements',
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage?: string
  ): Promise<{ success: boolean; translatedTitle?: string; translatedContent?: string }> {
    try {
      console.log('🌐 [ForumTranslation] Translating forum post:', { postId, postType, targetLanguage, sourceLanguage });

      // Fetch the current post data
      const { data: post, error: fetchError } = await supabase
        .from(postType)
        .select('title, content, title_ar, title_tr, title_en, content_ar, content_tr, content_en')
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

      const titleExists = !!(post[titleField]);
      const contentExists = !!(post[contentField]);

      // If both already exist, return existing translations
      if (titleExists && contentExists) {
        console.log('🌐 [ForumTranslation] Translations already exist, returning cached versions');
        return {
          success: true,
          translatedTitle: post[titleField],
          translatedContent: post[contentField]
        };
      }

      // Translate what's missing
      const updateData: any = {};
      let translatedTitle = post[titleField];
      let translatedContent = post[contentField];

      if (!titleExists && post.title) {
        // Detect the original language of the title if not provided
        const detectedTitleLang = sourceLanguage || await translationService.detectLanguage(post.title);
        console.log(`🌐 [ForumTranslation] Title language detected: ${detectedTitleLang}`);
        
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
        console.log(`🌐 [ForumTranslation] Title translated from ${detectedTitleLang} to ${targetLanguage}`);
      }

      if (!contentExists && post.content) {
        // Detect the original language of the content if not provided
        const detectedContentLang = sourceLanguage || await translationService.detectLanguage(post.content);
        console.log(`🌐 [ForumTranslation] Content language detected: ${detectedContentLang}`);
        
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
        console.log(`🌐 [ForumTranslation] Content translated from ${detectedContentLang} to ${targetLanguage}`);
      }

      // Update database with new translations
      if (Object.keys(updateData).length > 0) {
        console.log('🌐 [ForumTranslation] Updating database with translations:', updateData);
        const { error: updateError } = await supabase
          .from(postType)
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          console.error('Error updating translations:', updateError);
          return { success: false };
        }
        console.log('🌐 [ForumTranslation] Database updated successfully');
      }

      return {
        success: true,
        translatedTitle,
        translatedContent
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
    postType: 'forum_posts' | 'forum_announcements',
    postId: string
  ): Promise<void> {
    try {
      console.log('🌐 [ForumTranslation] Detecting and saving original language for:', { postType, postId });

      // Use the translation service's language detection
      const titleLang = await translationService.detectLanguage(title);
      const contentLang = await translationService.detectLanguage(content);

      console.log(`🌐 [ForumTranslation] Detected languages - Title: ${titleLang}, Content: ${contentLang}`);

      const updateData: any = {};

      // Save title to appropriate language field
      if (titleLang !== 'en') {
        const titleField = this.getTranslationField('title', titleLang);
        updateData[titleField] = title;
        console.log(`🌐 [ForumTranslation] Saving title to ${titleField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.title_en = title;
        console.log(`🌐 [ForumTranslation] Saving English title to title_en`);
      }

      // Save content to appropriate language field
      if (contentLang !== 'en') {
        const contentField = this.getTranslationField('content', contentLang);
        updateData[contentField] = content;
        console.log(`🌐 [ForumTranslation] Saving content to ${contentField}`);
      } else {
        // For English, save to the _en fields as well
        updateData.content_en = content;
        console.log(`🌐 [ForumTranslation] Saving English content to content_en`);
      }

      // Update the database
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(postType)
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          console.error('Error saving original language data:', updateError);
        } else {
          console.log('🌐 [ForumTranslation] Original language data saved successfully');
        }
      }
    } catch (error) {
      console.error('Error detecting and saving original language:', error);
    }
  }

  /**
   * Check if a post has translations in all languages
   */
  async hasCompleteTranslations(
    postId: string,
    postType: 'forum_posts' | 'forum_announcements'
  ): Promise<boolean> {
    try {
      const translations = await this.getAllTranslations(postId, postType);
      if (!translations) return false;

      // Check if we have title and content in all three languages
      const hasTitleInAll = !!(translations.title_ar && translations.title_tr && translations.title_en);
      const hasContentInAll = !!(translations.content_ar && translations.content_tr && translations.content_en);

      return hasTitleInAll && hasContentInAll;
    } catch (error) {
      console.error('Error checking complete translations:', error);
      return false;
    }
  }

  /**
   * Translate comment content with smart language detection
   */
  async translateComment(
    commentId: string,
    commentType: 'forum_comments' | 'forum_announcement_comments',
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage?: string
  ): Promise<{ success: boolean; translatedContent?: string }> {
    try {
      console.log('🌐 [ForumTranslation] Translating comment:', { commentId, commentType, targetLanguage, sourceLanguage });

      // Fetch the current comment data
      const { data: comment, error: fetchError } = await supabase
        .from(commentType)
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
        console.log('🌐 [ForumTranslation] Comment translation already exists, returning cached version');
        return {
          success: true,
          translatedContent: existingTranslation
        };
      }

      // Detect the original language of the content if not provided
      const detectedContentLang = sourceLanguage || await translationService.detectLanguage(comment.content);
      console.log(`🌐 [ForumTranslation] Comment content language detected: ${detectedContentLang}`);

      // Save original content to its language field if not already there
      if (detectedContentLang !== 'en') {
        const originalContentField = this.getTranslationField('content', detectedContentLang);
        if (!comment[originalContentField]) {
          const updateData = {
            [originalContentField]: comment.content
          };

          await supabase
            .from(commentType)
            .update(updateData)
            .eq('id', commentId);

          console.log(`🌐 [ForumTranslation] Saved original comment content to ${originalContentField}`);
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
        .from(commentType)
        .update(updateData)
        .eq('id', commentId);

      if (updateError) {
        console.error('Error updating comment translation:', updateError);
        return { success: false };
      }

      console.log(`🌐 [ForumTranslation] Comment translated from ${detectedContentLang} to ${targetLanguage}`);

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
export const forumTranslationService = ForumTranslationService.getInstance();