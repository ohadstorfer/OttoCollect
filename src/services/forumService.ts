import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types";
import { v4 as uuidv4 } from 'uuid';

// Get all forum posts
export const fetchForumPosts = async (): Promise<ForumPost[]> => {
  const { data, error } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:profiles!forum_posts_author_id_fkey(id, username, avatar_url, rank),
      comments:forum_comments(count)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(post => ({
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
    commentCount: post.comments[0]?.count || 0,
    createdAt: post.created_at,
    updatedAt: post.updated_at
  }));
};

// Get a specific post with comments
export const fetchForumPost = async (postId: string): Promise<ForumPost> => {
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select(`
      *,
      author:profiles!forum_posts_author_id_fkey(id, username, avatar_url, rank)
    `)
    .eq('id', postId)
    .single();

  if (postError) throw postError;

  const { data: comments, error: commentsError } = await supabase
    .from('forum_comments')
    .select(`
      *,
      author:profiles!forum_comments_author_id_fkey(id, username, avatar_url, rank)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.author_id,
    author: {
      id: post.author?.id,
      username: post.author?.username,
      avatarUrl: post.author?.avatar_url,
      rank: post.author?.rank
    },
    imageUrls: post.image_urls || [],
    comments: comments.map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: {
        id: comment.author?.id,
        username: comment.author?.username,
        avatarUrl: comment.author?.avatar_url,
        rank: comment.author?.rank
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    })),
    createdAt: post.created_at,
    updatedAt: post.updated_at
  };
};

// Create a new forum post
export const createForumPost = async (title: string, content: string, imageUrls: string[] = []): Promise<string> => {
  const user = supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to create a post');

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      title,
      content,
      image_urls: imageUrls,
      author_id: (await user).data.user?.id
    })
    .select();

  if (error) throw error;
  return data[0].id;
};

// Update a forum post
export const updateForumPost = async (postId: string, title: string, content: string, imageUrls: string[] = []): Promise<void> => {
  const { error } = await supabase
    .from('forum_posts')
    .update({
      title,
      content,
      image_urls: imageUrls,
      updated_at: new Date().toISOString()
    })
    .eq('id', postId);

  if (error) throw error;
};

// Delete a forum post
export const deleteForumPost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

// Create a comment
export const createForumComment = async (postId: string, content: string): Promise<string> => {
  const user = supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to comment');

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      post_id: postId,
      content,
      author_id: (await user).data.user?.id
    })
    .select();

  if (error) throw error;
  return data[0].id;
};

// Update a comment
export const updateForumComment = async (commentId: string, content: string): Promise<void> => {
  const { error } = await supabase
    .from('forum_comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId);

  if (error) throw error;
};

// Delete a comment
export const deleteForumComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase
    .from('forum_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
};

// Upload an image for a forum post
export const uploadForumImage = async (file: File): Promise<string> => {
  const user = supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to upload images');
  
  const userId = (await user).data.user?.id;
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${uuidv4()}.${fileExt}`;
  const filePath = fileName;

  const { error } = await supabase
    .storage
    .from('forum_images')
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase
    .storage
    .from('forum_images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
