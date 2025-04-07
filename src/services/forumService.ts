
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types/forum";

// Fetch all forum posts
export async function fetchForumPosts(): Promise<ForumPost[]> {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching forum posts:", error);
      return [];
    }

    const forumPosts: ForumPost[] = data.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: {
        id: post.author?.id || post.author_id,
        username: post.author?.username || 'Unknown User',
        avatarUrl: post.author?.avatar_url,
        rank: post.author?.rank || 'User',
      },
      imageUrls: post.image_urls || [],
      commentCount: post.comment_count || 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));

    return forumPosts;
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
}

// Fetch a single forum post by ID
export async function fetchForumPostById(postId: string): Promise<ForumPost | null> {
  try {
    // First, get the forum post
    const { data: postData, error: postError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      console.error("Error fetching forum post:", postError);
      return null;
    }

    // Get the comments separately
    const { data: commentsData, error: commentsError } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:profiles!forum_comments_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error("Error fetching forum comments:", commentsError);
      return null;
    }

    // Map the data to our types
    const comments: ForumComment[] = (commentsData || []).map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: {
        id: comment.author?.id || comment.author_id,
        username: comment.author?.username || 'Unknown User',
        avatarUrl: comment.author?.avatar_url,
        rank: comment.author?.rank || 'User',
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: comment.is_edited || false, // Add default value if not present in DB
    }));

    const forumPost: ForumPost = {
      id: postData.id,
      title: postData.title,
      content: postData.content,
      authorId: postData.author_id,
      author: {
        id: postData.author?.id || postData.author_id,
        username: postData.author?.username || 'Unknown User',
        avatarUrl: postData.author?.avatar_url,
        rank: postData.author?.rank || 'User',
      },
      imageUrls: postData.image_urls || [],
      comments,
      commentCount: comments.length,
      createdAt: postData.created_at,
      updatedAt: postData.updated_at,
    };

    return forumPost;
  } catch (error) {
    console.error("Error in fetchForumPostById:", error);
    return null;
  }
}

// Create a new forum post
export async function createForumPost(
  title: string,
  content: string,
  authorId: string,
  imageUrls: string[] = []
): Promise<ForumPost | null> {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title,
          content,
          author_id: authorId,
          image_urls: imageUrls,
        },
      ])
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error("Error creating forum post:", error);
      return null;
    }

    const forumPost: ForumPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author: {
        id: data.author?.id || data.author_id,
        username: data.author?.username || 'Unknown User',
        avatarUrl: data.author?.avatar_url,
        rank: data.author?.rank || 'User',
      },
      imageUrls: data.image_urls || [],
      commentCount: data.comment_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return forumPost;
  } catch (error) {
    console.error("Error in createForumPost:", error);
    return null;
  }
}

// Update an existing forum post
export async function updateForumPost(
  postId: string,
  userId: string,
  title: string,
  content: string,
  imageUrls: string[]
): Promise<ForumPost | null> {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({ title, content, image_urls: imageUrls })
      .eq('id', postId)
      .eq('author_id', userId)
      .select(`
        *,
        author:profiles!forum_posts_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error("Error updating forum post:", error);
      return null;
    }

    const forumPost: ForumPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author: {
        id: data.author?.id || data.author_id,
        username: data.author?.username || 'Unknown User',
        avatarUrl: data.author?.avatar_url,
        rank: data.author?.rank || 'User',
      },
      imageUrls: data.image_urls || [],
      commentCount: data.comment_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return forumPost;
  } catch (error) {
    console.error("Error in updateForumPost:", error);
    return null;
  }
}

// Delete a forum post
export async function deleteForumPost(postId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId);

    if (error) {
      console.error("Error deleting forum post:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteForumPost:", error);
    return false;
  }
}

// Add a comment to a forum post
export async function addForumComment(
  postId: string,
  content: string,
  authorId: string
): Promise<ForumComment | null> {
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: authorId,
          is_edited: false // Add this field explicitly
        },
      ])
      .select(`
        *,
        author:profiles!forum_comments_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error("Error adding forum comment:", error);
      return null;
    }

    const forumComment: ForumComment = {
      id: data.id,
      postId: data.post_id,
      content: data.content,
      authorId: data.author_id,
      author: {
        id: data.author?.id || data.author_id,
        username: data.author?.username || 'Unknown User',
        avatarUrl: data.author?.avatar_url,
        rank: data.author?.rank || 'User',
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false,
    };

    return forumComment;
  } catch (error) {
    console.error("Error in addForumComment:", error);
    return null;
  }
}

// Update a forum comment
export async function updateForumComment(
  commentId: string,
  userId: string,
  content: string
): Promise<ForumComment | null> {
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .update({ content, is_edited: true })
      .eq('id', commentId)
      .eq('author_id', userId)
      .select(`
        *,
        author:profiles!forum_comments_author_id_fkey (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .single();

    if (error) {
      console.error("Error updating forum comment:", error);
      return null;
    }

    const forumComment: ForumComment = {
      id: data.id,
      postId: data.post_id,
      content: data.content,
      authorId: data.author_id,
      author: {
        id: data.author?.id || data.author_id,
        username: data.author?.username || 'Unknown User',
        avatarUrl: data.author?.avatar_url,
        rank: data.author?.rank || 'User',
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false,
    };

    return forumComment;
  } catch (error) {
    console.error("Error in updateForumComment:", error);
    return null;
  }
}

// Delete a forum comment
export async function deleteForumComment(commentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error("Error deleting forum comment:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteForumComment:", error);
    return false;
  }
}
