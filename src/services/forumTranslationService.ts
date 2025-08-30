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
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; translatedTitle?: string; translatedContent?: string }> {
    try {
      console.log('Translating forum post:', { postId, postType, targetLanguage, sourceLanguage });

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
        translatedTitle = await translationService.translateText(post.title, targetLanguage, sourceLanguage);
        updateData[titleField] = translatedTitle;
      }

      if (!contentExists && post.content) {
        translatedContent = await translationService.translateText(post.content, targetLanguage, sourceLanguage);
        updateData[contentField] = translatedContent;
      }

      // Update database with new translations
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from(postType)
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
      // Simple language detection - in a real app you might use a proper language detection service
      const hasArabicChars = /[\u0600-\u06FF]/.test(title + content);
      const hasTurkishChars = /[çğıöşüÇĞIİÖŞÜ]/.test(title + content);

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

        const updateData = {
          [titleField]: title,
          [contentField]: content
        };

        await supabase
          .from(postType)
          .update(updateData)
          .eq('id', postId);
      } else {
        // For English, save to the _en fields as well
        const updateData = {
          title_en: title,
          content_en: content
        };

        await supabase
          .from(postType)
          .update(updateData)
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error detecting and saving original language:', error);
    }
  }

  /**
   * Translate comment content
   */
  async translateComment(
    commentId: string,
    commentType: 'forum_comments' | 'forum_announcement_comments',
    targetLanguage: 'ar' | 'tr' | 'en',
    sourceLanguage: string = 'en'
  ): Promise<{ success: boolean; translatedContent?: string }> {
    try {
      console.log('Translating forum comment:', { commentId, commentType, targetLanguage, sourceLanguage });

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
        .from(commentType)
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
}

// Export singleton instance
export const forumTranslationService = ForumTranslationService.getInstance();