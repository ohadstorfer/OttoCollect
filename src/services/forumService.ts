import { supabase } from '@/integrations/supabase/client';
import { ForumPost, ForumComment, normalizeForumPost, normalizeForumComment } from '@/types/forum';

/**
 * Fetch all forum posts
 */
export const fetchForumPosts = async (): Promise<ForumPost[]> => {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching forum posts:', error);
      return [];
    }

    // Process the data to match our ForumPost type
    return data.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      image_urls: post.image_urls || [],
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: {
        id: post.profiles.id,
        username: post.profiles.username,
        avatarUrl: post.profiles.avatar_url,
        rank: post.profiles.rank
      }
    }));
  } catch (error) {
    console.error('Error in fetchForumPosts:', error);
    return [];
  }
};

/**
 * Fetch a single forum post by ID
 */
export const fetchForumPostById = async (id: string): Promise<ForumPost | null> => {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        ),
        forum_comments (
          id,
          post_id,
          content,
          created_at,
          updated_at,
          profiles:author_id (
            id,
            username,
            avatar_url,
            rank
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching forum post:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Normalize forum post
    const normalizedPost = normalizeForumPost({
      id: data.id,
      title: data.title,
      content: data.content,
      author_id: data.author_id,
      image_urls: data.image_urls || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    });

    // Normalize forum comments
    const normalizedComments = (data.forum_comments || []).map(comment => normalizeForumComment({
      id: comment.id,
      post_id: comment.post_id,
      content: comment.content,
      author_id: comment.profiles.id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.profiles.id,
        username: comment.profiles.username,
        avatarUrl: comment.profiles.avatar_url,
        rank: comment.profiles.rank
      }
    }));

    return {
      ...normalizedPost,
      comments: normalizedComments,
      commentCount: normalizedComments.length
    };
  } catch (error) {
    console.error('Error in fetchForumPostById:', error);
    return null;
  }
};

/**
 * Create a new forum post
 */
export const createForumPost = async (
  title: string,
  content: string,
  imageUrls: string[] | null | undefined
): Promise<{ data: ForumPost | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title,
          content,
          author_id: user.id,
          image_urls: imageUrls || [],
        },
      ])
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error('Error creating forum post:', error);
      return { data: null, error };
    }

    // Process the data to match our ForumPost type
    const newPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      author_id: data.author_id,
      image_urls: data.image_urls || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };

    return { data: newPost, error: null };
  } catch (error: any) {
    console.error('Error in createForumPost:', error);
    return { data: null, error };
  }
};

/**
 * Update an existing forum post
 */
export const updateForumPost = async (
  id: string,
  title: string,
  content: string,
  imageUrls: string[] | null | undefined
): Promise<{ data: ForumPost | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('forum_posts')
      .update({
        title,
        content,
        image_urls: imageUrls || [],
      })
      .eq('id', id)
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error('Error updating forum post:', error);
      return { data: null, error };
    }

    // Process the data to match our ForumPost type
    const updatedPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      author_id: data.author_id,
      image_urls: data.image_urls || [],
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };

    return { data: updatedPost, error: null };
  } catch (error: any) {
    console.error('Error in updateForumPost:', error);
    return { data: null, error };
  }
};

/**
 * Delete a forum post
 */
export const deleteForumPost = async (id: string): Promise<{ success: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting forum post:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteForumPost:', error);
    return { success: false, error };
  }
};

/**
 * Add a comment to a forum post
 */
export const addForumComment = async (
  postId: string,
  content: string
): Promise<{ data: ForumComment | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: user.id,
        },
      ])
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error('Error adding forum comment:', error);
      return { data: null, error };
    }

    // Process the data to match our ForumComment type
    const newComment = {
      id: data.id,
      post_id: data.post_id,
      content: data.content,
      author_id: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };

    return { data: newComment, error: null };
  } catch (error: any) {
    console.error('Error in addForumComment:', error);
    return { data: null, error };
  }
};

/**
 * Update a forum comment
 */
export const updateForumComment = async (
  id: string,
  content: string
): Promise<{ data: ForumComment | null; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('forum_comments')
      .update({
        content,
        isEdited: true
      })
      .eq('id', id)
      .select(`
        *,
        profiles:author_id (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error('Error updating forum comment:', error);
      return { data: null, error };
    }

    // Process the data to match our ForumComment type
    const updatedComment = {
      id: data.id,
      post_id: data.post_id,
      content: data.content,
      author_id: data.author_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      isEdited: data.isEdited,
      author: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };

    return { data: updatedComment, error: null };
  } catch (error: any) {
    console.error('Error in updateForumComment:', error);
    return { data: null, error };
  }
};

/**
 * Delete a forum comment
 */
export const deleteForumComment = async (id: string): Promise<{ success: boolean; error: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting forum comment:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in deleteForumComment:', error);
    return { success: false, error };
  }
};
