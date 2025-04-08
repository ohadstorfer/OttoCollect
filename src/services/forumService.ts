
import { supabase } from "@/integrations/supabase/client";
import { ForumPost, ForumComment } from "@/types/forum";
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

// Fetch all forum posts - modified approach
export async function fetchForumPosts(): Promise<ForumPost[]> {
  try {
    // Fetch posts first
    const { data: postsData, error: postsError } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError || !postsData) {
      console.error("Error fetching forum posts:", postsError);
      return [];
    }

    // Get comment counts for each post
    const { data: commentData, error: commentError } = await supabase
      .from('forum_comments')
      .select('post_id, count')
      .eq('count', '*')
      .groupBy('post_id');

    // Get all author ids to fetch their profiles
    const authorIds = [...new Set(postsData.map(post => post.author_id))];
    
    // Fetch author profiles in a separate query
    const { data: authorProfiles, error: authorError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', authorIds);
    
    if (authorError) {
      console.error("Error fetching author profiles:", authorError);
    }
    
    // Create a map of profiles by id for easy lookup
    const profilesMap = new Map();
    if (authorProfiles) {
      authorProfiles.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Create comment count map
    const commentCountMap = new Map();
    if (commentData && Array.isArray(commentData)) {
      commentData.forEach(item => {
        if (item && item.post_id) {
          commentCountMap.set(item.post_id, item.count || 0);
        }
      });
    }

    // Combine data into forum posts
    const forumPosts: ForumPost[] = postsData.map(post => {
      const authorProfile = profilesMap.get(post.author_id);
      
      // Map the rank from string to UserRank type
      const rankAsUserRank = mapStringToUserRank(
        authorProfile?.rank || 'Newbie'
      );
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.author_id,
        author: authorProfile ? {
          id: authorProfile.id,
          username: authorProfile.username || 'Unknown User',
          avatarUrl: authorProfile.avatar_url,
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

// Fetch a single forum post by ID
export async function fetchForumPostById(postId: string): Promise<ForumPost | null> {
  try {
    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
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
    const { data: comments, error: commentsError } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error("Error fetching comments:", commentsError);
    }

    // For each comment, fetch the author info
    const commentPromises = comments?.map(async (comment) => {
      const { data: commentAuthor } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rank')
        .eq('id', comment.author_id)
        .single();

      const rankAsUserRank = mapStringToUserRank(
        commentAuthor?.rank || 'Newbie'
      );

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
        isEdited: comment.is_edited || false,
      };
    }) || [];

    const processedComments = await Promise.all(commentPromises || []);
    const rankAsUserRank = mapStringToUserRank(author?.rank || 'Newbie');

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

    if (postError || !post) {
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

    const rankAsUserRank = mapStringToUserRank(author?.rank || 'Newbie');

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

    if (postError || !post) {
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

    const rankAsUserRank = mapStringToUserRank(author?.rank || 'Newbie');

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
      commentCount: 0, // We'll have to fetch comments separately if needed
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
    // Ensure the is_edited column exists
    await ensureIsEditedColumnExists();
    
    const { data: comment, error: commentError } = await supabase
      .from('forum_comments')
      .insert([
        {
          post_id: postId,
          content,
          author_id: authorId,
          is_edited: false,
        },
      ])
      .select()
      .single();

    if (commentError || !comment) {
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

    const rankAsUserRank = mapStringToUserRank(author?.rank || 'Newbie');

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
      isEdited: comment.is_edited || false,
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
    await ensureIsEditedColumnExists();
    
    const { data: comment, error: commentError } = await supabase
      .from('forum_comments')
      .update({ content, is_edited: true })
      .eq('id', commentId)
      .eq('author_id', userId)
      .select()
      .single();

    if (commentError || !comment) {
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

    const rankAsUserRank = mapStringToUserRank(author?.rank || 'Newbie');

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
      isEdited: comment.is_edited || false,
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

// Helper function to make sure the is_edited column exists
async function ensureIsEditedColumnExists() {
  try {
    // Check if column exists
    const { data } = await supabase.rpc('column_exists', {
      table_name: 'forum_comments',
      column_name: 'is_edited'
    });
    
    // If column doesn't exist, add it
    if (!data) {
      await supabase.rpc('add_is_edited_column');
      console.log("Added is_edited column to forum_comments table");
    }
  } catch (error) {
    console.error("Error in ensureIsEditedColumnExists:", error);
    // Continue anyway as the column might exist despite the error
  }
}
