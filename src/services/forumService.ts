import { supabase } from '@/integrations/supabase/client';
import { ForumPost, ForumComment } from '@/types/forum';

/**
 * Check if user has reached daily forum activity limit
 */
export const checkUserDailyForumLimit = async (userId: string): Promise<{ hasReachedLimit: boolean; dailyCount: number }> => {
  try {
    console.log("Checking user daily forum limit for user:", userId);
    
    // Call the database function to check if user has reached limit
    const { data: limitData, error: limitError } = await supabase
      .rpc('user_has_reached_daily_forum_limit', { user_id_param: userId });

    if (limitError) {
      console.error('Error checking daily forum limit:', limitError);
      return { hasReachedLimit: false, dailyCount: 0 };
    }

    // Get the daily activity count
    const { data: countData, error: countError } = await supabase
      .rpc('get_user_daily_forum_activity_count', { user_id_param: userId });

    if (countError) {
      console.error('Error getting daily activity count:', countError);
      return { hasReachedLimit: limitData || false, dailyCount: 0 };
    }

    console.log("Daily forum limit check result:", { hasReachedLimit: limitData, dailyCount: countData });
    
    return {
      hasReachedLimit: limitData || false,
      dailyCount: countData || 0
    };
  } catch (error) {
    console.error('Error in checkUserDailyForumLimit:', error);
    return { hasReachedLimit: false, dailyCount: 0 };
  }
};

/**
 * Fetch all forum posts
 */
export const fetchForumPosts = async (): Promise<ForumPost[]> => {
  try {
    console.log("Fetching forum posts...");
    
    // Step 1: Fetch forum posts with comment counts
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        forum_comments:forum_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching forum posts:', postsError);
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

    // Step 5: Combine data to create normalized forum posts
    return posts.map(post => {
      const authorProfile = profileMap[post.author_id] || null;
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        author_id: post.author_id,
        authorId: post.author_id, // Add compatibility alias
        image_urls: post.image_urls || [],
        imageUrls: post.image_urls || [],
        created_at: post.created_at,
        updated_at: post.updated_at,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        commentCount: post.forum_comments?.[0]?.count || 0,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatar_url,
          rank: authorProfile.rank
        } : null
      };
    });
  } catch (error) {
    console.error('Error in fetchForumPosts:', error);
    return [];
  }
};

/**
 * Create a new forum announcement
 */
export const createForumAnnouncement = async (
  title: string,
  content: string,
  authorId: string,
  imageUrls?: string[] | null
): Promise<ForumPost | null> => {
  try {
    console.log("Creating forum announcement:", { title, authorId });
    
    const { data, error } = await supabase
      .from('forum_announcements')
      .insert({
        title,
        content,
        author_id: authorId,
        image_urls: imageUrls || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating forum announcement:', error);
      return null;
    }

    console.log("Created announcement:", data.id);
    return data;
  } catch (error) {
    console.error('Error in createForumAnnouncement:', error);
    return null;
  }
};

/**
 * Fetch a single forum post by ID
 */
export const fetchForumPostById = async (id: string): Promise<ForumPost | null> => {
  try {
    console.log("Fetching forum post by ID:", id);
    
    // Step 1: Fetch the forum post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError) {
      console.error('Error fetching forum post:', postError);
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

    // Step 4: Normalize and return the forum post
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      authorId: post.author_id,
      image_urls: post.image_urls || [],
      imageUrls: post.image_urls || [],
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
    console.error('Error in fetchForumPostById:', error);
    return null;
  }
};

/**
 * Build comment tree structure with nested replies
 */
const buildCommentTree = (comments: any[]): ForumComment[] => {
  const commentMap = new Map();
  const rootComments: ForumComment[] = [];

  // First pass: create all comment objects
  comments.forEach(comment => {
    const formattedComment = {
      id: comment.id,
      post_id: comment.post_id,
      postId: comment.post_id,
      content: comment.content,
      author_id: comment.author_id,
      authorId: comment.author_id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: comment.is_edited || false,
      parent_comment_id: comment.parent_comment_id,
      author: comment.author,
      replies: [] as ForumComment[]
    };
    commentMap.set(comment.id, formattedComment);
  });

  // Second pass: build the tree structure
  comments.forEach(comment => {
    const formattedComment = commentMap.get(comment.id);
    if (comment.parent_comment_id) {
      // This is a reply
      const parentComment = commentMap.get(comment.parent_comment_id);
      if (parentComment) {
        parentComment.replies.push(formattedComment);
      }
    } else {
      // This is a root comment
      rootComments.push(formattedComment);
    }
  });

  // Sort replies by creation date (oldest first for natural reading)
  const sortReplies = (comment: ForumComment) => {
    comment.replies = comment.replies.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    comment.replies.forEach(sortReplies);
  };

  rootComments.forEach(sortReplies);
  return rootComments;
};

/**
 * Fetch comments for a specific post with nested structure
 */
export const fetchCommentsByPostId = async (postId: string): Promise<ForumComment[]> => {
  try {
    console.log("Fetching comments for post:", postId);
    
    // Step 1: Fetch comments for the post with author profiles
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:profiles!forum_comments_author_id_fkey(
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return [];
    }

    console.log("Fetched comments:", comments.length);

    if (comments.length === 0) {
      return [];
    }

    // Step 2: Format and build tree structure
    const formattedComments = comments.map(comment => ({
      ...comment,
      author: comment.author ? {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatar_url,
        rank: comment.author.rank
      } : null
    }));

    // Step 3: Build the comment tree
    return buildCommentTree(formattedComments);
  } catch (error) {
    console.error('Error in fetchCommentsByPostId:', error);
    return [];
  }
};

/**
 * Create a new forum post
 */
export const createForumPost = async (
  title: string,
  content: string,
  authorId: string,
  imageUrls: string[] | null = []
): Promise<ForumPost | null> => {
  try {
    console.log("Creating forum post...");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Insert the new post
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title,
          content,
          author_id: authorId,
          image_urls: imageUrls || [],
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating forum post:', error);
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
      author_id: data.author_id,
      authorId: data.author_id,
      image_urls: data.image_urls || [],
      imageUrls: data.image_urls || [],
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
    console.error('Error in createForumPost:', error);
    return null;
  }
};

/**
 * Update an existing forum post
 */
export const updateForumPost = async (
  id: string,
  title: string,
  content: string,
  imageUrls: string[] | null = []
): Promise<ForumPost | null> => {
  try {
    console.log("Updating forum post:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Update the post
    const { data, error } = await supabase
      .from('forum_posts')
      .update({
        title,
        content,
        image_urls: imageUrls || [],
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating forum post:', error);
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
      author_id: data.author_id,
      authorId: data.author_id,
      image_urls: data.image_urls || [],
      imageUrls: data.image_urls || [],
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
    console.error('Error in updateForumPost:', error);
    return null;
  }
};

/**
 * Delete a forum post
 */
export const deleteForumPost = async (id: string): Promise<boolean> => {
  try {
    console.log("Deleting forum post:", id);
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
      return false;
    }

    console.log("Deleted post:", id);
    return true;
  } catch (error) {
    console.error('Error in deleteForumPost:', error);
    return false;
  }
};

/**
 * Add a comment to a forum post or reply to another comment
 */
export const addForumComment = async (
  postId: string,
  content: string,
  parentCommentId?: string
): Promise<ForumComment | null> => {
  try {
    console.log("Adding comment to post:", postId);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Insert the new comment
    const { data, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: user.id,
          parent_comment_id: parentCommentId || null,
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error adding forum comment:', error);
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
    console.error('Error in addForumComment:', error);
    return null;
  }
};

/**
 * Update a forum comment
 */
export const updateForumComment = async (
  id: string,
  content: string
): Promise<ForumComment | null> => {
  try {
    console.log("Updating comment:", id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Step 1: Update the comment
    const { data, error } = await supabase
      .from('forum_comments')
      .update({
        content,
        is_edited: true
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating forum comment:', error);
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
    console.error('Error in updateForumComment:', error);
    return null;
  }
};

/**
 * Delete a forum comment
 */
export const deleteForumComment = async (id: string): Promise<boolean> => {
  try {
    console.log("Deleting comment:", id);
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
      return false;
    }

    console.log("Deleted comment:", id);
    return true;
  } catch (error) {
    console.error('Error in deleteForumComment:', error);
    return false;
  }
};

/**
 * Upload an image for a forum post
 */
export const uploadForumImage = async (file: File): Promise<string> => {
  try {
    console.log("Uploading forum image...");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const fileName = `${Math.random().toString(36).substring(2)}-${file.name}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('forum_images')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get the public URL
    const { data } = supabase.storage
      .from('forum_images')
      .getPublicUrl(filePath);

    console.log("Uploaded image:", data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadForumImage:', error);
    throw error;
  }
};
