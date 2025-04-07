import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types";

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
    // First, get all posts
    const { data: postsData, error: postsError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(
          id, 
          username, 
          avatar_url,
          rank
        )
      `)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error("Error fetching forum posts:", postsError);
      throw postsError;
    }

    // For each post, get the comment count
    const posts = await Promise.all((postsData || []).map(async (post) => {
      // Get comment count
      const { count: commentCount, error: countError } = await supabase
        .from('forum_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      if (countError) {
        console.error(`Error fetching comment count for post ${post.id}:`, countError);
      }

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        author: post.author ? {
          id: post.author.id || '',
          username: post.author.username || '',
          avatarUrl: post.author.avatar_url || undefined,
          rank: post.author.rank || 'Newbie'
        } : undefined,
        imageUrls: post.image_urls || [],
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        commentCount: commentCount || 0
      } as ForumPost;
    }));

    return posts;
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
}

// Fetch a single forum post with comments
export async function fetchForumPost(id: string): Promise<ForumPost> {
  try {
    // Get the post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(
          id, 
          username, 
          avatar_url,
          rank
        )
      `)
      .eq('id', id)
      .single();

    if (postError) {
      console.error("Error fetching forum post:", postError);
      throw postError;
    }

    // Get the comments
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select(`
        *,
        author:profiles(
          id, 
          username, 
          avatar_url,
          rank
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      console.error("Error fetching forum comments:", commentsError);
      throw commentsError;
    }

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: post.author ? {
        id: post.author.id || '',
        username: post.author.username || '',
        avatarUrl: post.author.avatar_url || undefined,
        rank: post.author.rank || 'Newbie'
      } : undefined,
      imageUrls: post.image_urls || [],
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      comments: comments.map(comment => ({
        id: comment.id,
        postId: comment.post_id,
        content: comment.content,
        authorId: comment.author_id,
        author: comment.author ? {
          id: comment.author.id || '',
          username: comment.author.username || '',
          avatarUrl: comment.author.avatar_url || undefined,
          rank: comment.author.rank || 'Newbie'
        } : undefined,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: comment.is_edited || false
      }))
    };
  } catch (error) {
    console.error("Error in fetchForumPost:", error);
    throw error;
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
export async function updateForumComment(commentId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('forum_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
      is_edited: true
    })
    .eq('id', commentId);

  if (error) {
    console.error("Error updating forum comment:", error);
    throw error;
  }
}

// Delete a comment
export async function deleteForumComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('forum_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error("Error deleting forum comment:", error);
    throw error;
  }
}
