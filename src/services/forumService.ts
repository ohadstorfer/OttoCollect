
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment, ImageSuggestion } from "@/types/forum";
import { v4 as uuidv4 } from 'uuid';
import { UserRank } from "@/types";

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

    // Map posts to the ForumPost type
    const forumPosts: ForumPost[] = postsData.map(post => {
      const author = authorsMap.get(post.author_id);
      const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        author: author ? {
          id: author.id,
          username: author.username || 'Unknown User',
          avatarUrl: author.avatar_url,
          rank: rankAsUserRank
        } : undefined,
        imageUrls: post.image_urls || [],
        commentCount: commentCountMap.get(post.id) || 0,
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

// Check if is_edited column exists in forum_comments table
async function checkIsEditedColumnExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('column_exists', {
      table_name: 'forum_comments',
      column_name: 'is_edited'
    });
    
    return data || false;
  } catch (error) {
    console.error("Error checking if is_edited column exists:", error);
    return false;
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

    // Fetch comments
    const { data: commentsData, error: commentsError } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
    }

    // Check if is_edited column exists
    const hasIsEditedColumn = await checkIsEditedColumnExists();

    // For each comment, fetch the author info
    const comments = commentsData || [];
    const commentAuthorIds = Array.from(new Set(comments.map(comment => comment.author_id)));
    
    // Fetch all comment authors in one query
    const { data: commentAuthors, error: commentAuthorsError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', commentAuthorIds);
      
    if (commentAuthorsError) {
      console.error("Error fetching comment authors:", commentAuthorsError);
    }
    
    // Create a map of comment authors by ID
    const commentAuthorsMap = new Map();
    if (commentAuthors) {
      commentAuthors.forEach(author => {
        commentAuthorsMap.set(author.id, author);
      });
    }
    
    // Process comments
    const processedComments: ForumComment[] = comments.map(comment => {
      const commentAuthor = commentAuthorsMap.get(comment.author_id);
      const rankAsUserRank = commentAuthor 
        ? mapStringToUserRank(commentAuthor.rank || 'Newbie') 
        : 'Newbie';
        
      return {
        id: comment.id,
        postId: comment.post_id,
        content: comment.content,
        authorId: comment.author_id,
        author: commentAuthor ? {
          id: commentAuthor.id,
          username: commentAuthor.username || 'Unknown User',
          avatarUrl: commentAuthor.avatar_url,
          rank: rankAsUserRank
        } : undefined,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: hasIsEditedColumn ? comment.is_edited || false : false,
      };
    });

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    const forumPost: ForumPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      imageUrls: post.image_urls || [],
      comments: processedComments,
      commentCount: processedComments.length,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
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

    const forumPost: ForumPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      imageUrls: post.image_urls || [],
      commentCount: 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
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

    const forumPost: ForumPost = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      imageUrls: post.image_urls || [],
      commentCount: 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
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
    // Check if is_edited column exists
    const hasIsEditedColumn = await checkIsEditedColumnExists();
    
    const insertData: any = {
      post_id: postId,
      content,
      author_id: authorId
    };
    
    // Only add is_edited if the column exists
    if (hasIsEditedColumn) {
      insertData.is_edited = false;
    }

    const { data: comment, error: commentError } = await supabase
      .from('forum_comments')
      .insert([insertData])
      .select()
      .single();

    if (commentError) {
      console.error("Error adding forum comment:", commentError);
      return null;
    }

    // Fetch the author profile
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', comment.author_id)
      .single();

    if (authorError) {
      console.error("Error fetching author profile:", authorError);
    }

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    const forumComment: ForumComment = {
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: hasIsEditedColumn ? comment.is_edited || false : false,
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
    // Check if is_edited column exists
    const hasIsEditedColumn = await checkIsEditedColumnExists();

    const updateData: any = { content };
    
    // Only add is_edited if the column exists
    if (hasIsEditedColumn) {
      updateData.is_edited = true;
    }

    const { data: comment, error: commentError } = await supabase
      .from('forum_comments')
      .update(updateData)
      .eq('id', commentId)
      .eq('author_id', userId)
      .select()
      .single();

    if (commentError) {
      console.error("Error updating forum comment:", commentError);
      return null;
    }

    // Fetch the author profile
    const { data: author, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', comment.author_id)
      .single();

    if (authorError) {
      console.error("Error fetching author profile:", authorError);
    }

    const rankAsUserRank = author ? mapStringToUserRank(author.rank || 'Newbie') : 'Newbie';

    const forumComment: ForumComment = {
      id: comment.id,
      postId: comment.post_id,
      content: comment.content,
      authorId: comment.author_id,
      author: author ? {
        id: author.id,
        username: author.username || 'Unknown User',
        avatarUrl: author.avatar_url,
        rank: rankAsUserRank
      } : undefined,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      isEdited: hasIsEditedColumn ? comment.is_edited || false : false,
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
