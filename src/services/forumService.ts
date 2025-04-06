
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types";
import { v4 as uuidv4 } from 'uuid';

// Get all forum posts
export const fetchForumPosts = async (): Promise<ForumPost[]> => {
  const { data: postsData, error: postsError } = await supabase
    .from('forum_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (postsError) throw postsError;

  // Get comment counts for each post
  const postIds = postsData.map(post => post.id);
  
  // Get comment counts using a count query
  const { data: commentCounts, error: countError } = await supabase
    .from('forum_comments')
    .select('post_id, count')
    .in('post_id', postIds)
    .group('post_id');
    
  if (countError) {
    console.error("Error fetching comment counts:", countError);
  }
  
  // Create a map of postId -> comment count
  const commentCountMap = new Map();
  commentCounts?.forEach(item => {
    commentCountMap.set(item.post_id, parseInt(item.count));
  });

  // Fetch author profiles separately
  const authorIds = [...new Set(postsData.map(post => post.author_id))];
  
  const { data: authorsData, error: authorsError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', authorIds);
    
  if (authorsError) {
    console.error("Error fetching author profiles:", authorsError);
  }
  
  // Create a map of authorId -> profile
  const authorsMap = new Map();
  authorsData?.forEach(author => {
    authorsMap.set(author.id, author);
  });

  // Map the posts with authors and comment counts
  return postsData.map(post => {
    const authorProfile = authorsMap.get(post.author_id);
    
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: authorProfile ? {
        id: authorProfile.id,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatar_url,
        rank: authorProfile.rank
      } : undefined,
      imageUrls: post.image_urls || [],
      commentCount: commentCountMap.get(post.id) || 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at
    };
  });
};

// Get a specific post with comments
export const fetchForumPost = async (postId: string): Promise<ForumPost> => {
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (postError) throw postError;

  // Fetch the post author
  const { data: authorData, error: authorError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', post.author_id)
    .single();

  if (authorError) {
    console.error("Error fetching post author:", authorError);
  }

  // Fetch comments
  const { data: commentsData, error: commentsError } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  // Get comment authors
  const commentAuthorIds = [...new Set(commentsData.map(comment => comment.author_id))];
  
  const { data: commentAuthorsData, error: commentAuthorsError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', commentAuthorIds);
    
  if (commentAuthorsError) {
    console.error("Error fetching comment authors:", commentAuthorsError);
  }
  
  // Create a map of authorId -> profile
  const commentAuthorsMap = new Map();
  commentAuthorsData?.forEach(author => {
    commentAuthorsMap.set(author.id, author);
  });

  // Map the comments with authors
  const mappedComments = commentsData.map(comment => {
    const commentAuthor = commentAuthorsMap.get(comment.author_id);
    
    return {
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: commentAuthor ? {
        id: commentAuthor.id,
        username: commentAuthor.username,
        avatarUrl: commentAuthor.avatar_url,
        rank: commentAuthor.rank
      } : undefined,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    };
  });

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    authorId: post.author_id,
    author: authorData ? {
      id: authorData.id,
      username: authorData.username,
      avatarUrl: authorData.avatar_url,
      rank: authorData.rank
    } : undefined,
    imageUrls: post.image_urls || [],
    comments: mappedComments,
    createdAt: post.created_at,
    updatedAt: post.updated_at
  };
};

// Create a new forum post
export const createForumPost = async (title: string, content: string, imageUrls: string[] = []): Promise<string> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to create a post');
  }

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      title,
      content,
      image_urls: imageUrls,
      author_id: userData.user.id
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
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to comment');
  }

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      post_id: postId,
      content,
      author_id: userData.user.id
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
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    throw new Error('You must be logged in to upload images');
  }
  
  const userId = userData.user.id;
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
