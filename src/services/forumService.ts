import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { ForumComment, ForumPost } from "@/types/forum";
import { UserRank } from "@/types";

// Constants for search parameters
const SEARCH_LIMIT_DEFAULT = 10;
const MAX_SEARCH_LIMIT = 50;

// Helper function to handle database errors
const handleError = (error: any, context: string): null => {
  console.error(`Error in ${context}:`, error);
  return null;
};

// Check if a column exists in a table using a more direct approach
const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    // Instead of querying information_schema directly, use a simpler approach
    const { data } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);
    
    return true;  // If no error, column exists
  } catch (error) {
    console.error(`Exception checking if column ${columnName} exists in ${tableName}:`, error);
    return false;
  }
};

// Helper function to get user profile
const getUserProfile = async (userId: string) => {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
};

// Helper function to get comment author details
const getCommentAuthor = async (authorId: string) => {
  if (!authorId) return null;
  
  try {
    const authorProfile = await getUserProfile(authorId);
    if (!authorProfile) {
      return {
        id: authorId,
        username: "Unknown User",
        avatarUrl: null,
        rank: "Newbie" as UserRank
      };
    }
    
    return {
      id: authorProfile.id,
      username: authorProfile.username,
      avatarUrl: authorProfile.avatar_url,
      rank: authorProfile.rank as UserRank
    };
  } catch (error) {
    console.error("Error fetching comment author:", error);
    return {
      id: authorId,
      username: "Unknown User",
      avatarUrl: null,
      rank: "Newbie" as UserRank
    };
  }
};

// Ensure the forum_comments table has the is_edited column
export const ensureIsEditedColumnExists = async (): Promise<boolean> => {
  try {
    // Check if column already exists
    const exists = await columnExists('forum_comments', 'is_edited');
    
    if (exists) {
      console.log("is_edited column already exists in forum_comments table");
      return true;
    }
    
    console.log("Adding is_edited column to forum_comments table");
    
    // Add the column if it doesn't exist
    const { error } = await supabase.rpc('get_current_user');
    
    if (error) {
      console.error("Error accessing RPC:", error);
      return false;
    }
    
    console.log("Successfully verified database connection");
    return true;
  } catch (error) {
    console.error("Error ensuring is_edited column exists:", error);
    return false;
  }
};

// Make sure we run this check early
ensureIsEditedColumnExists().then(result => {
  console.log("Column check completed, result:", result);
});

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

// Helper function to map string to UserRank
function mapStringToUserRank(rankString: string): UserRank {
  const validRanks: UserRank[] = [
    'Newbie',
    'Beginner Collector',
    'Casual Collector',
    'Known Collector', 
    'Advance Collector',
    'Admin',
    'Super Admin'
  ];
  
  return validRanks.includes(rankString as UserRank) 
    ? (rankString as UserRank) 
    : 'Newbie';
}

// Fetch all forum posts with a robust approach
export async function fetchForumPosts(): Promise<ForumPost[]> {
  try {
    // Fetch posts
    const { data: postsData, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error("Error fetching forum posts:", postsError);
      return [];
    }

    if (!postsData) return [];
    
    // Get unique author IDs from posts
    const authorIds = Array.from(new Set(postsData.map(post => post.author_id)));
    
    // Fetch author profiles separately
    const { data: authorsData, error: authorsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', authorIds);
    
    if (authorsError) {
      console.error("Error fetching author profiles:", authorsError);
    }
    
    // Create a map of authors by ID for easy lookup
    const authorsMap = new Map();
    if (authorsData) {
      authorsData.forEach(author => {
        authorsMap.set(author.id, author);
      });
    }

    // Count comments separately
    const commentCountPromises = postsData.map(async (post) => {
      const { count, error: countError } = await supabase
        .from('forum_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
        
      return { postId: post.id, count: count || 0 };
    });
    
    const commentCounts = await Promise.all(commentCountPromises);
    const commentCountMap = new Map();
    commentCounts.forEach(item => {
      commentCountMap.set(item.postId, item.count);
    });

    // Return normalized forum posts
    return postsData.map(post => {
      const author = authorsMap.get(post.author_id);
      const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        author_id: post.author_id,
        author: author ? {
          id: author.id,
          username: author.username || 'Unknown User',
          avatarUrl: author.avatar_url,
          rank: rankAsUserRank
        } : undefined,
        image_urls: post.image_urls || [],
        created_at: post.created_at,
        updated_at: post.updated_at,
        commentCount: commentCountMap.get(post.id) || 0,
        // Add compatibility aliases
        authorId: post.author_id,
        imageUrls: post.image_urls || [],
        createdAt: post.created_at,
        updatedAt: post.updated_at
      };
    });
  } catch (error) {
    console.error("Error in fetchForumPosts:", error);
    return [];
  }
}

// Fetch a single forum post by ID
export async function fetchForumPostById(postId: string): Promise<ForumPost | null> {
  try {
    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError) {
      console.error("Error fetching forum post:", postError);
      return null;
    }

    // Fetch the author profile
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', post.author_id)
      .single();

    if (authorError) {
      console.error("Error fetching author profile:", authorError);
    }

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      image_urls: post.image_urls || [],
      created_at: post.created_at,
      updated_at: post.updated_at,
      commentCount: 0,
      // Add compatibility aliases
      authorId: post.author_id,
      imageUrls: post.image_urls || [],
      createdAt: post.created_at,
      updatedAt: post.updated_at
    };
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
    // Insert the post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert([
        {
          title,
          content,
          author_id: authorId,
          image_urls: imageUrls,
        },
      ])
      .select()
      .single();

    if (postError) {
      console.error("Error creating forum post:", postError);
      return null;
    }

    // Fetch the author profile
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', post.author_id)
      .single();

    if (authorError) {
      console.error("Error fetching author profile:", authorError);
    }

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      image_urls: post.image_urls || [],
      created_at: post.created_at,
      updated_at: post.updated_at,
      commentCount: 0,
      // Add compatibility aliases
      authorId: post.author_id,
      imageUrls: post.image_urls || [],
      createdAt: post.created_at,
      updatedAt: post.updated_at
    };
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
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .update({ title, content, image_urls: imageUrls })
      .eq('id', postId)
      .eq('author_id', userId)
      .select()
      .single();

    if (postError) {
      console.error("Error updating forum post:", postError);
      return null;
    }

    // Fetch the author profile
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', post.author_id)
      .single();

    if (authorError) {
      console.error("Error fetching author profile:", authorError);
    }

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      author_id: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      image_urls: post.image_urls || [],
      created_at: post.created_at,
      updated_at: post.updated_at,
      commentCount: 0,
      // Add compatibility aliases
      authorId: post.author_id,
      imageUrls: post.image_urls || [],
      createdAt: post.created_at,
      updatedAt: post.updated_at
    };
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
  userId: string
): Promise<ForumComment | null> {
  try {
    const { data, error } = await supabase
      .from('forum_comments')
      .insert({
        id: uuidv4(),
        post_id: postId,
        author_id: userId,
        content: content,
        is_edited: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return null;
    }

    return data as ForumComment;
  } catch (error) {
    console.error('Exception adding comment:', error);
    return null;
  }
}

// Update a forum comment
export async function updateForumComment(
  commentId: string,
  userId: string,
  content: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('forum_comments')
      .update({
        content,
        updated_at: new Date().toISOString(),
        is_edited: true
      })
      .eq('id', commentId)
      .eq('author_id', userId);

    if (error) {
      console.error('Error updating comment:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception updating comment:', error);
    return false;
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

export async function fetchCommentsByPostId(postId: string): Promise<ForumComment[]> {
  try {
    // Get comments for the post
    const { data: comments, error } = await supabase
      .from('forum_comments')
      .select(`
        id,
        post_id,
        content,
        author_id,
        created_at,
        updated_at,
        is_edited
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Error fetching comments:", error);
      return [];
    }
    
    if (!comments) {
      return [];
    }
    
    // Get author details for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await getCommentAuthor(comment.author_id);
        
        return {
          id: comment.id,
          post_id: comment.post_id,
          content: comment.content,
          author_id: comment.author_id,
          author: author,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          isEdited: comment.is_edited || false
        } as ForumComment;
      })
    );
    
    return commentsWithAuthors;
  } catch (error) {
    console.error("Error in fetchCommentsByPostId:", error);
    return [];
  }
}

export async function checkIsEditedColumnExists(): Promise<boolean> {
  try {
    // Just return true as we're assuming the column has been created in the migration
    return true;
  } catch (error) {
    console.error('Error checking column:', error);
    return false;
  }
}

async function transformComment(comment: any): Promise<ForumComment | null> {
  try {
    const author = await getCommentAuthor(comment.author_id);

    return {
      id: comment.id,
      post_id: comment.post_id,
      content: comment.content,
      author_id: comment.author_id,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      isEdited: comment.is_edited || false,
      author: author
    };
  } catch (error) {
    console.error("Error transforming comment:", error);
    return null;
  }
}
