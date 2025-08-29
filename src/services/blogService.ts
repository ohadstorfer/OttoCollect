import { supabase } from '@/integrations/supabase/client';
import { BlogPost, BlogComment } from '@/types/blog';

/**
 * Check if user has reached daily blog activity limit
 */
export const checkUserDailyBlogLimit = async (userId: string): Promise<{ hasReachedLimit: boolean; dailyCount: number }> => {
  try {
    console.log("Checking user daily blog limit for user:", userId);
    
    // Call the database function to check if user has reached limit
    const { data: limitData, error: limitError } = await supabase
      .rpc('user_has_reached_daily_blog_limit', { user_id_param: userId });

    if (limitError) {
      console.error('Error checking daily blog limit:', limitError);
      return { hasReachedLimit: false, dailyCount: 0 };
    }

    // Get the daily activity count
    const { data: countData, error: countError } = await supabase
      .rpc('get_user_daily_blog_activity_count', { user_id_param: userId });

    if (countError) {
      console.error('Error getting daily activity count:', countError);
      return { hasReachedLimit: limitData || false, dailyCount: 0 };
    }

    console.log("Daily blog limit check result:", { hasReachedLimit: limitData, dailyCount: countData });
    
    return {
      hasReachedLimit: limitData || false,
      dailyCount: countData || 0
    };
  } catch (error) {
    console.error('Error in checkUserDailyBlogLimit:', error);
    return { hasReachedLimit: false, dailyCount: 0 };
  }
};

/**
 * Fetch all blog posts
 */
export const fetchBlogPosts = async (): Promise<BlogPost[]> => {
  try {
    console.log("Fetching blog posts...");
    
    // Step 1: Fetch blog posts with comment counts
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_comments:blog_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching blog posts:', postsError);
      return [];
    }

    console.log("Fetched posts:", posts.length);

    // Step 2: Get unique author IDs from posts
    const authorIds = Array.from(new Set(posts.map(post => post.author_id)));
    
    // Step 3: Fetch author profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', authorIds);

    if (profilesError) {
      console.error('Error fetching author profiles:', profilesError);
      return [];
    }

    console.log("Fetched profiles:", profiles.length);

    // Step 4: Create a lookup map for profiles
    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);

    // Step 5: Combine data to create normalized blog posts
    return posts.map(post => {
      const authorProfile = profileMap[post.author_id] || null;
      
      return {
        id: post.id,
        title: post.title,
        title_ar: post.title_ar,
        title_tr: post.title_tr,
        content: post.content,
        content_ar: post.content_ar,
        content_tr: post.content_tr,
        excerpt: post.excerpt,
        excerpt_ar: post.excerpt_ar,
        excerpt_tr: post.excerpt_tr,
        main_image_url: post.main_image_url,
        author_id: post.author_id,
        authorId: post.author_id, // Add compatibility alias
        created_at: post.created_at,
        updated_at: post.updated_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        commentCount: post.blog_comments?.[0]?.count || 0,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatar_url,
          rank: authorProfile.rank
        } : null
      };
    });
  } catch (error) {
    console.error('Error in fetchBlogPosts:', error);
    return [];
  }
};

/**
 * Fetch a single blog post by ID
 */
export const fetchBlogPostById = async (id: string): Promise<BlogPost | null> => {
  try {
    console.log("Fetching blog post by ID:", id);
    
    // Step 1: Fetch the blog post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError) {
      console.error('Error fetching blog post:', postError);
      return null;
    }

    if (!post) {
      return null;
    }

    console.log("Fetched post:", post.id);

    // Step 2: Fetch the author profile
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', post.author_id)
      .single();

    if (authorError) {
      console.error('Error fetching author profile:', authorError);
      // Continue without author info
    }

    console.log("Fetched author profile:", authorProfile?.id);

    // Step 3: Fetch comments for this post
    const comments = await fetchCommentsByPostId(id);
    console.log("Fetched comments:", comments.length);

    // Step 4: Normalize and return the blog post
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      main_image_url: post.main_image_url,
      author_id: post.author_id,
      authorId: post.author_id,
      created_at: post.created_at,
      updated_at: post.updated_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : null,
      comments,
      commentCount: comments.length
    };
  } catch (error) {
    console.error('Error in fetchBlogPostById:', error);
    return null;
  }
};

/**
 * Fetch comments for a specific post
 */
export const fetchCommentsByPostId = async (postId: string): Promise<BlogComment[]> => {
  try {
    console.log("Fetching comments for post:", postId);
    
    // Step 1: Fetch comments for the post
    const { data: comments, error: commentsError } = await supabase
      .from('blog_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return [];
    }

    console.log("Fetched comments:", comments.length);

    // Step 2: Get unique author IDs from comments
    const authorIds = Array.from(new Set(comments.map(comment => comment.author_id)));
    
    if (authorIds.length === 0) {
      return [];
    }

    // Step 3: Fetch author profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', authorIds);

    if (profilesError) {
      console.error('Error fetching comment author profiles:', profilesError);
      return [];
    }

    console.log("Fetched comment profiles:", profiles.length);

    // Step 4: Create a lookup map for profiles
    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);

    // Step 5: Combine data to create normalized comments
    return comments.map(comment => {
      const authorProfile = profileMap[comment.author_id] || null;
      
      return {
        id: comment.id,
        post_id: comment.post_id,
        postId: comment.post_id, // Add compatibility alias
        content: comment.content,
        author_id: comment.author_id,
        authorId: comment.author_id, // Add compatibility alias
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: comment.is_edited || false,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatar_url,
          rank: authorProfile.rank
        } : null
      };
    });
  } catch (error) {
    console.error('Error in fetchCommentsByPostId:', error);
    return [];
  }
};

/**
 * Create a new blog post
 */
export const createBlogPost = async (
  title: string,
  content: string,
  excerpt: string,
  main_image_url: string,
  authorId: string
): Promise<BlogPost | null> => {
  try {
    console.log("Creating blog post...");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Insert the new post
    const { data, error } = await supabase
      .from('blog_posts')
      .insert([
        {
          title,
          content,
          excerpt,
          main_image_url,
          author_id: authorId,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating blog post:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log("Created post:", data.id);

    // Step 2: Fetch the author profile
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', authorId)
      .single();

    if (authorError) {
      console.error('Error fetching author profile:', authorError);
      // Continue without author info
    }

    // Step 3: Normalize and return the new post
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      main_image_url: data.main_image_url,
      author_id: data.author_id,
      authorId: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : null,
      commentCount: 0
    };
  } catch (error) {
    console.error('Error in createBlogPost:', error);
    return null;
  }
};

/**
 * Update an existing blog post
 */
export const updateBlogPost = async (
  id: string,
  title: string,
  content: string,
  excerpt: string,
  main_image_url: string
): Promise<BlogPost | null> => {
  try {
    console.log("Updating blog post:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Update the post
    const { data, error } = await supabase
      .from('blog_posts')
      .update({
        title,
        content,
        excerpt,
        main_image_url,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating blog post:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log("Updated post:", data.id);

    // Step 2: Fetch the author profile
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', data.author_id)
      .single();

    if (authorError) {
      console.error('Error fetching author profile:', authorError);
      // Continue without author info
    }

    // Step 3: Normalize and return the updated post
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      main_image_url: data.main_image_url,
      author_id: data.author_id,
      authorId: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : null
    };
  } catch (error) {
    console.error('Error in updateBlogPost:', error);
    return null;
  }
};

/**
 * Delete a blog post
 */
export const deleteBlogPost = async (id: string): Promise<boolean> => {
  try {
    console.log("Deleting blog post:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting blog post:', error);
      return false;
    }

    console.log("Deleted post:", id);
    return true;
  } catch (error) {
    console.error('Error in deleteBlogPost:', error);
    return false;
  }
};

/**
 * Add a comment to a blog post
 */
export const addBlogComment = async (
  postId: string,
  content: string
): Promise<BlogComment | null> => {
  try {
    console.log("Adding comment to post:", postId);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Insert the new comment
    const { data, error } = await supabase
      .from('blog_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: user.id,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error adding blog comment:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log("Added comment:", data.id);

    // Step 2: Fetch the author profile
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', user.id)
      .single();

    if (authorError) {
      console.error('Error fetching author profile:', authorError);
      // Continue without author info
    }

    // Step 3: Normalize and return the new comment
    return {
      id: data.id,
      post_id: data.post_id,
      postId: data.post_id,
      content: data.content,
      author_id: data.author_id,
      authorId: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : null
    };
  } catch (error) {
    console.error('Error in addBlogComment:', error);
    return null;
  }
};

/**
 * Update an existing blog comment
 */
export const updateBlogComment = async (
  id: string,
  content: string
): Promise<BlogComment | null> => {
  try {
    console.log("Updating blog comment:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Update the comment
    const { data, error } = await supabase
      .from('blog_comments')
      .update({
        content,
        is_edited: true,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating blog comment:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log("Updated comment:", data.id);

    // Step 2: Fetch the author profile
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', data.author_id)
      .single();

    if (authorError) {
      console.error('Error fetching author profile:', authorError);
      // Continue without author info
    }

    // Step 3: Normalize and return the updated comment
    return {
      id: data.id,
      post_id: data.post_id,
      postId: data.post_id,
      content: data.content,
      author_id: data.author_id,
      authorId: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : null
    };
  } catch (error) {
    console.error('Error in updateBlogComment:', error);
    return null;
  }
};

/**
 * Delete a blog comment
 */
export const deleteBlogComment = async (id: string): Promise<boolean> => {
  try {
    console.log("Deleting blog comment:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('blog_comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting blog comment:', error);
      return false;
    }

    console.log("Deleted comment:", id);
    return true;
  } catch (error) {
    console.error('Error in deleteBlogComment:', error);
    return false;
  }
};

/**
 * Fetch blog posts with translation support
 */
export const fetchBlogPostsWithTranslations = async (currentLanguage: string = 'en'): Promise<BlogPost[]> => {
  try {
    console.log("Fetching blog posts with translations for language:", currentLanguage);
    
    // Step 1: Fetch blog posts with comment counts and translation fields
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        *,
        blog_comments:blog_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching blog posts:', postsError);
      return [];
    }

    console.log("Fetched posts:", posts.length);

    // Step 2: Get unique author IDs from posts
    const authorIds = Array.from(new Set(posts.map(post => post.author_id)));
    
    // Step 3: Fetch author profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', authorIds);

    if (profilesError) {
      console.error('Error fetching author profiles:', profilesError);
      return [];
    }

    console.log("Fetched profiles:", profiles.length);

    // Step 4: Create a lookup map for profiles
    const profileMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {} as Record<string, any>);

    // Step 5: Combine data to create normalized blog posts
    const blogPosts = posts.map(post => {
      const authorProfile = profileMap[post.author_id] || null;
      
      return {
        id: post.id,
        title: post.title,
        title_ar: post.title_ar || null,
        title_tr: post.title_tr || null,
        content: post.content,
        content_ar: post.content_ar || null,
        content_tr: post.content_tr || null,
        excerpt: post.excerpt,
        excerpt_ar: post.excerpt_ar || null,
        excerpt_tr: post.excerpt_tr || null,
        main_image_url: post.main_image_url,
        author_id: post.author_id,
        authorId: post.author_id,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatar_url,
          rank: authorProfile.rank
        } : null,
        created_at: post.created_at,
        updated_at: post.updated_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        commentCount: post.blog_comments?.[0]?.count || 0
      };
    });

    // Step 6: If language is Arabic or Turkish, apply translation logic
    if (currentLanguage === 'ar' || currentLanguage === 'tr') {
      try {
        const { databaseTranslationService, createNameTranslationConfig } = await import('./databaseTranslationService');
        
        // Create translation config for blog posts
        const translationConfig = {
          table: 'blog_posts',
          idField: 'id',
          fields: [
            {
              originalField: 'title',
              arField: 'title_ar',
              trField: 'title_tr'
            },
            {
              originalField: 'content',
              arField: 'content_ar',
              trField: 'content_tr'
            },
            {
              originalField: 'excerpt',
              arField: 'excerpt_ar',
              trField: 'excerpt_tr'
            }
          ]
        };
        
        // Apply localization with auto-translation for missing translations
        const localizedPosts = await databaseTranslationService.getLocalizedRecords(
          translationConfig,
          blogPosts,
          currentLanguage,
          true // Auto-translate missing translations
        );

        // Return the localized posts
        return localizedPosts;
      } catch (error) {
        console.error('Translation service error, falling back to original content:', error);
        // Return original posts if translation fails
        return blogPosts;
      }
    }

    return blogPosts;
  } catch (error) {
    console.error('Error in fetchBlogPostsWithTranslations:', error);
    return [];
  }
};

/**
 * Upload an image for blog posts
 */
export const uploadBlogImage = async (file: File): Promise<string> => {
  try {
    console.log("Uploading blog image...");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('forum_images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('forum_images')
      .getPublicUrl(filePath);

    console.log("Uploaded image:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadBlogImage:', error);
    throw error;
  }
};