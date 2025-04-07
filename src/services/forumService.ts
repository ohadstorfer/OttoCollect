
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types/forum";

// Helper function to map database post to ForumPost type
const mapDbPostToForumPost = (post: any): ForumPost => {
  // Manually map profile data to avoid type errors with relation queries
  const author = post.author_data ? {
    id: post.author_data.id,
    username: post.author_data.username,
    avatarUrl: post.author_data.avatar_url,
    rank: post.author_data.rank,
  } : undefined;

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.author_id,
    author,
    imageUrls: post.image_urls || [],
    commentCount: post.comment_count,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
  };
};

// Helper function to map database comment to ForumComment type
const mapDbCommentToForumComment = (comment: any): ForumComment => {
  // Manually map profile data to avoid type errors with relation queries
  const author = comment.author_data ? {
    id: comment.author_data.id,
    username: comment.author_data.username,
    avatarUrl: comment.author_data.avatar_url,
    rank: comment.author_data.rank,
  } : undefined;
  
  return {
    id: comment.id,
    postId: comment.post_id,
    content: comment.content,
    authorId: comment.author_id,
    author,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
    isEdited: comment.is_edited || comment.created_at !== comment.updated_at,
  };
};

// Upload a forum post image
export async function uploadForumImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  // Create a unique file name to prevent collisions
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  
  const { data, error } = await supabase
    .storage
    .from('forum_images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Error uploading forum image:", error);
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase
    .storage
    .from('forum_images')
    .getPublicUrl(data.path);

  return publicUrl;
}

// Create a new forum post
export async function createForumPost(title: string, content: string, imageUrls: string[] = []): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  const post = {
    title,
    content,
    author_id: user.id,
    image_urls: imageUrls
  };

  const { data, error } = await supabase
    .from('forum_posts')
    .insert(post)
    .select('id')
    .single();

  if (error) {
    console.error("Error creating forum post:", error);
    throw error;
  }

  return data.id;
}

// Update a forum post
export async function updateForumPost(id: string, title: string, content: string, imageUrls: string[] = []): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from('forum_posts')
    .update({
      title,
      content,
      image_urls: imageUrls,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) {
    console.error("Error updating forum post:", error);
    throw error;
  }
}

// Delete a forum post
export async function deleteForumPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting forum post:", error);
    throw error;
  }
}

// Fetch all forum posts
export async function fetchForumPosts(): Promise<ForumPost[]> {
  try {
    // First, fetch all posts and include comment count
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select('*, author:author_id(id, username, avatar_url, rank), comment_count:forum_comments(count)');
    
    if (error) {
      console.error("Error fetching forum posts:", error);
      return [];
    }
    
    // Map the database posts to our ForumPost type
    return posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        avatarUrl: post.author.avatar_url,
        rank: post.author.rank,
      } : undefined,
      imageUrls: post.image_urls || [],
      commentCount: post.comment_count ? post.comment_count.length : 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }));
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
}

// Fetch a single forum post with comments
export async function fetchForumPost(postId: string): Promise<ForumPost | null> {
  try {
    // Fetch the post
    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('*, author:author_id(id, username, avatar_url, rank)')
      .eq('id', postId)
      .single();
    
    if (error) {
      console.error("Error fetching forum post:", error);
      return null;
    }
    
    // Fetch comments for this post
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select('*, author:author_id(id, username, avatar_url, rank)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
      
    if (commentsError) {
      console.error("Error fetching post comments:", commentsError);
    }
    
    // Map comments to our ForumComment type
    const mappedComments = comments?.map((comment: any) => ({
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: comment.author ? {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatar_url,
        rank: comment.author.rank,
      } : undefined,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: comment.created_at !== comment.updated_at,
    })) || [];
    
    // Assemble the final post object with author and comments
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        avatarUrl: post.author.avatar_url,
        rank: post.author.rank,
      } : undefined,
      imageUrls: post.image_urls || [],
      comments: mappedComments,
      commentCount: mappedComments.length,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    };
  } catch (error) {
    console.error("Error in fetchForumPost:", error);
    return null;
  }
}

// Create a comment on a forum post
export async function createForumComment(postId: string, content: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("User not authenticated");

  const comment = {
    post_id: postId,
    content,
    author_id: user.id
  };

  const { data, error } = await supabase
    .from('forum_comments')
    .insert(comment)
    .select('id')
    .single();

  if (error) {
    console.error("Error creating forum comment:", error);
    throw error;
  }

  return data.id;
}

// Update a comment
export async function updateForumComment(
  commentId: string, 
  userId: string, 
  content: string
): Promise<ForumComment | null> {
  try {
    // First, check if the user owns this comment
    const { data: comment, error: fetchError } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('id', commentId)
      .eq('author_id', userId)
      .single();
    
    if (fetchError || !comment) {
      console.error("Error fetching comment or unauthorized:", fetchError);
      return null;
    }
    
    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('forum_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, author:author_id(id, username, avatar_url, rank)')
      .single();
    
    if (error) {
      console.error("Error updating comment:", error);
      return null;
    }
    
    // Return the updated comment with author info
    return {
      id: updatedComment.id,
      postId: updatedComment.post_id,
      content: updatedComment.content,
      authorId: updatedComment.author_id,
      author: updatedComment.author ? {
        id: updatedComment.author.id,
        username: updatedComment.author.username,
        avatarUrl: updatedComment.author.avatar_url,
        rank: updatedComment.author.rank,
      } : undefined,
      createdAt: updatedComment.created_at,
      updatedAt: updatedComment.updated_at,
      isEdited: true,
    };
  } catch (error) {
    console.error("Error in updateForumComment:", error);
    return null;
  }
}

// Delete a comment
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
