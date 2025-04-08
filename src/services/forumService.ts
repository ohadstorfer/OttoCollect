
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types/forum";
import { v4 as uuidv4 } from 'uuid';

// Upload forum image to Supabase storage
export async function uploadForumImage(file: File): Promise<string> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error("User not authenticated");

    const userId = user.data.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('forum_images')
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from('forum_images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadForumImage:", error);
    throw error;
  }
}

// Fetch all forum posts
export async function fetchForumPosts(): Promise<ForumPost[]> {
  try {
    // Sleep for 1 second to ensure database relationships are established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(id, username, avatar_url, rank),
        comment_count:forum_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching forum posts:", error);
      return [];
    }

    // Check if data exists and is an array
    if (!data || !Array.isArray(data)) {
      console.error("No data returned or invalid data format");
      return [];
    }

    const forumPosts: ForumPost[] = data.map(post => {
      // Default author values if author is null or missing properties
      const author = post.author ? {
        id: post.author.id || post.author_id || '',
        username: post.author.username || 'Unknown User',
        avatarUrl: post.author.avatar_url,
        rank: post.author.rank || 'User',
      } : undefined;

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        author,
        imageUrls: post.image_urls || [],
        commentCount: post.comment_count?.[0]?.count || 0,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
      };
    });

    return forumPosts;
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
}

// Fetch a single forum post by ID
export async function fetchForumPostById(postId: string): Promise<ForumPost | null> {
  try {
    // First, make sure the is_edited column exists
    await ensureIsEditedColumnExists();
    
    // Sleep for 1 second to ensure database relationships are established
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        author:profiles(id, username, avatar_url, rank),
        comments:forum_comments (
          id,
          post_id,
          content,
          author_id,
          created_at,
          updated_at,
          is_edited,
          author:profiles(id, username, avatar_url, rank)
        ),
        comment_count:forum_comments(count)
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error("Error fetching forum post:", error);
      return null;
    }

    if (!data) return null;

    // Process the data with safe type handling
    const forumPost: ForumPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author: data.author ? {
        id: data.author.id || data.author_id,
        username: data.author.username || 'Unknown User',
        avatarUrl: data.author.avatar_url,
        rank: data.author.rank || 'User',
      } : undefined,
      imageUrls: data.image_urls || [],
      comments: Array.isArray(data.comments) ? data.comments.map(comment => {
        // Handle potential null/undefined values safely
        return {
          id: comment?.id || '',
          postId: comment?.post_id || '',
          content: comment?.content || '',
          authorId: comment?.author_id || '',
          author: comment?.author ? {
            id: comment.author.id || comment.author_id || '',
            username: comment.author.username || 'Unknown User',
            avatarUrl: comment.author.avatar_url,
            rank: comment.author.rank || 'User',
          } : undefined,
          createdAt: comment?.created_at || new Date().toISOString(),
          updatedAt: comment?.updated_at || new Date().toISOString(),
          isEdited: !!comment?.is_edited,
        };
      }) : [],
      commentCount: data.comment_count?.[0]?.count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
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
        author:profiles(id, username, avatar_url, rank),
        comment_count:forum_comments(count)
      `)
      .single();

    if (error) {
      console.error("Error creating forum post:", error);
      return null;
    }

    // Safe type handling for author
    const author = data.author ? {
      id: data.author.id || data.author_id || '',
      username: data.author.username || 'Unknown User',
      avatarUrl: data.author.avatar_url,
      rank: data.author.rank || 'User',
    } : {
      id: data.author_id,
      username: 'Unknown User',
      avatarUrl: undefined,
      rank: 'User',
    };

    const forumPost: ForumPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author,
      imageUrls: data.image_urls || [],
      commentCount: data.comment_count?.[0]?.count || 0,
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
        author:profiles(id, username, avatar_url, rank),
        comment_count:forum_comments(count)
      `)
      .single();

    if (error) {
      console.error("Error updating forum post:", error);
      return null;
    }

    // Safe type handling for author
    const author = data.author ? {
      id: data.author.id || data.author_id || '',
      username: data.author.username || 'Unknown User',
      avatarUrl: data.author.avatar_url,
      rank: data.author.rank || 'User',
    } : {
      id: data.author_id,
      username: 'Unknown User',
      avatarUrl: undefined,
      rank: 'User',
    };

    const forumPost: ForumPost = {
      id: data.id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      author,
      imageUrls: data.image_urls || [],
      commentCount: data.comment_count?.[0]?.count || 0,
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
    await ensureIsEditedColumnExists();
    
    const { data, error } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: authorId,
          is_edited: false,
        },
      ])
      .select(`
        *,
        author:profiles(id, username, avatar_url, rank)
      `)
      .single();

    if (error) {
      console.error("Error adding forum comment:", error);
      return null;
    }

    // Process data safely
    if (data) {
      const forumComment: ForumComment = {
        id: data.id,
        postId: data.post_id,
        content: data.content,
        authorId: data.author_id,
        author: data.author ? {
          id: data.author.id || data.author_id || '',
          username: data.author.username || 'Unknown User',
          avatarUrl: data.author.avatar_url,
          rank: data.author.rank || 'User',
        } : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isEdited: !!data.is_edited,
      };
      return forumComment;
    }
    
    return null;
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
    await ensureIsEditedColumnExists();
    
    const { data, error } = await supabase
      .from('forum_comments')
      .update({ content, is_edited: true })
      .eq('id', commentId)
      .eq('author_id', userId)
      .select(`
        *,
        author:profiles(id, username, avatar_url, rank)
      `)
      .single();

    if (error) {
      console.error("Error updating forum comment:", error);
      return null;
    }

    // Process data safely
    if (data) {
      const forumComment: ForumComment = {
        id: data.id,
        postId: data.post_id,
        content: data.content,
        authorId: data.author_id,
        author: data.author ? {
          id: data.author.id || data.author_id || '',
          username: data.author.username || 'Unknown User',
          avatarUrl: data.author.avatar_url,
          rank: data.author.rank || 'User',
        } : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isEdited: !!data.is_edited,
      };
      return forumComment;
    }
    
    return null;
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

// Helper function to make sure the is_edited column exists
async function ensureIsEditedColumnExists() {
  try {
    // We no longer need RPC calls as we already created the column via migration
    // Just log for debugging purposes
    console.log("Ensuring is_edited column exists in forum_comments table");
  } catch (error) {
    console.error("Error in ensureIsEditedColumnExists:", error);
    // Continue anyway as the column might exist despite the error
  }
}
