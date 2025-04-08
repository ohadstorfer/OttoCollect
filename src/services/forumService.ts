
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types";

// === Forum Posts ===

// Check if the is_edited column exists in forum_comments table
const checkIsEditedColumnExists = async (): Promise<boolean> => {
  try {
    // We'll use a simpler approach - just assume it exists after our migration
    return true;
  } catch (error) {
    console.error("Error in checkIsEditedColumnExists:", error);
    return false;
  }
};

// Fetch all forum posts with author details
export const fetchForumPosts = async (): Promise<ForumPost[]> => {
  try {
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching forum posts:", error);
      throw error;
    }

    // Fetch comment count for each post
    const postsWithCommentCount = await Promise.all(
      posts.map(async (post) => {
        const { count, error: countError } = await supabase
          .from('forum_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id);

        if (countError) {
          console.error("Error fetching comment count:", countError);
          return { ...post, commentCount: 0 };
        }

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          authorId: post.author_id,
          author: post.author ? {
            id: post.author.id,
            username: post.author.username,
            avatarUrl: post.author.avatar_url,
            rank: post.author.rank
          } : undefined,
          imageUrls: post.image_urls || [],
          commentCount: count || 0,
          createdAt: post.created_at,
          updatedAt: post.updated_at
        };
      })
    );

    return postsWithCommentCount;
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
};

// Create a new forum post
export const createForumPost = async (
  title: string,
  content: string,
  authorId: string,
  imageUrls: string[] = []
): Promise<ForumPost | null> => {
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([
        {
          title,
          content,
          author_id: authorId,
          image_urls: imageUrls
        }
      ])
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .single();

    if (error) {
      console.error("Error creating forum post:", error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author: data.author ? {
        id: data.author.id,
        username: data.author.username,
        avatarUrl: data.author.avatar_url,
        rank: data.author.rank
      } : undefined,
      imageUrls: data.image_urls || [],
      commentCount: 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Error in createForumPost:", error);
    return null;
  }
};

// Fetch a single forum post by ID with comments
export const fetchForumPostById = async (postId: string): Promise<ForumPost | null> => {
  try {
    console.log("Fetching forum post by id:", postId);
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error("Error fetching forum post:", error);
      return null;
    }

    // Fetch comments for this post
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        author: post.author ? {
          id: post.author.id,
          username: post.author.username,
          avatarUrl: post.author.avatar_url,
          rank: post.author.rank
        } : undefined,
        imageUrls: post.image_urls || [],
        comments: [],
        createdAt: post.created_at,
        updatedAt: post.updated_at
      };
    }

    // Map comments to the expected format
    const formattedComments: ForumComment[] = comments.map(comment => {
      if (!comment) return null as any;
      return {
        id: comment.id,
        postId: comment.post_id,
        content: comment.content,
        authorId: comment.author_id,
        author: comment.author ? {
          id: comment.author.id,
          username: comment.author.username,
          avatarUrl: comment.author.avatar_url,
          rank: comment.author.rank
        } : undefined,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: comment.is_edited || false
      };
    });

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        avatarUrl: post.author.avatar_url,
        rank: post.author.rank
      } : undefined,
      imageUrls: post.image_urls || [],
      comments: formattedComments,
      createdAt: post.created_at,
      updatedAt: post.updated_at
    };
  } catch (error) {
    console.error("Error in fetchForumPostById:", error);
    return null;
  }
};

// === Forum Comments ===

// Add a comment to a forum post
export const addCommentToPost = async (
  postId: string,
  content: string,
  authorId: string
): Promise<ForumComment | null> => {
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: authorId,
          is_edited: false
        }
      ])
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      return null;
    }

    return {
      id: data.id,
      postId: data.post_id,
      content: data.content,
      authorId: data.author_id,
      author: data.author ? {
        id: data.author.id,
        username: data.author.username,
        avatarUrl: data.author.avatar_url,
        rank: data.author.rank
      } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false
    };
  } catch (error) {
    console.error("Error in addCommentToPost:", error);
    return null;
  }
};

// Edit a comment - alias for updateForumComment
export const editComment = async (
  commentId: string,
  content: string,
  authorId: string
): Promise<ForumComment | null> => {
  return updateForumComment(commentId, authorId, content);
};

// Export these functions with the new expected names
export const addForumComment = addCommentToPost;
export const updateForumComment = async (
  commentId: string,
  authorId: string,
  content: string
): Promise<ForumComment | null> => {
  try {
    // Update the comment
    const { data, error } = await supabase
      .from('forum_comments')
      .update({
        content,
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('author_id', authorId) // Ensure only the author can edit
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .single();

    if (error) {
      console.error("Error editing comment:", error);
      return null;
    }

    return {
      id: data.id,
      postId: data.post_id,
      content: data.content,
      authorId: data.author_id,
      author: data.author ? {
        id: data.author.id,
        username: data.author.username,
        avatarUrl: data.author.avatar_url,
        rank: data.author.rank
      } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isEdited: data.is_edited || false
    };
  } catch (error) {
    console.error("Error in updateForumComment:", error);
    return null;
  }
};

// Delete a comment
export const deleteComment = async (
  commentId: string,
  authorId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('forum_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', authorId); // Ensure only the author can delete

    if (error) {
      console.error("Error deleting comment:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteComment:", error);
    return false;
  }
};

// Alias for deleteForumComment
export const deleteForumComment = deleteComment;

// Fetch comments for a post
export const fetchCommentsForPost = async (postId: string): Promise<ForumComment[]> => {
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:author_id(id, username, avatar_url, rank)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }

    // Map comments to the expected format
    return data.map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: comment.author ? {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatar_url,
        rank: comment.author.rank
      } : undefined,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: comment.is_edited || false
    }));
  } catch (error) {
    console.error("Error in fetchCommentsForPost:", error);
    return [];
  }
};

// Mock function for image uploading - replace with actual implementation
export const uploadForumImage = async (file: File): Promise<string> => {
  try {
    // Here we'd normally upload the image to storage
    // But for now, we'll return a mock URL
    return URL.createObjectURL(file);
  } catch (error) {
    console.error("Error uploading forum image:", error);
    throw new Error("Failed to upload image");
  }
};
