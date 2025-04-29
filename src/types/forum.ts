
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  authorId?: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  image_urls?: string[];
  imageUrls?: string[];
  created_at: string;
  updated_at: string;
  commentCount?: number;
  comments?: ForumComment[];
  
  // Compatibility aliases to handle both naming conventions
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  created_at: string;
  updated_at: string;
  isEdited?: boolean;
  
  // Compatibility aliases to handle both naming conventions
  postId?: string;
  authorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumPostWithAuthor extends ForumPost {
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    rank: string;
  };
}

export interface ForumCommentWithAuthor extends ForumComment {
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    rank: string;
  };
}

export interface ImageSuggestion {
  id: string;
  banknoteId: string;
  userId: string;
  banknote: {
    catalogId: string;
    country: string;
    denomination: string;
  };
  user: {
    username: string;
    avatarUrl?: string;
  };
  imageUrl: string;
  type: 'obverse' | 'reverse';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// Helper function to normalize forum post data
export const normalizeForumPost = (post: any): ForumPost => {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    author_id: post.author_id || post.authorId,
    author: post.author,
    image_urls: post.image_urls || post.imageUrls || [],
    created_at: post.created_at || post.createdAt,
    updated_at: post.updated_at || post.updatedAt,
    commentCount: post.commentCount || 0,
    // Add compatibility aliases
    authorId: post.author_id || post.authorId,
    imageUrls: post.image_urls || post.imageUrls || [],
    createdAt: post.created_at || post.createdAt,
    updatedAt: post.updated_at || post.updatedAt
  };
};

// Helper function to normalize forum comment data
export const normalizeForumComment = (comment: any): ForumComment => {
  return {
    id: comment.id,
    post_id: comment.post_id || comment.postId,
    content: comment.content,
    author_id: comment.author_id || comment.authorId,
    author: comment.author,
    created_at: comment.created_at || comment.createdAt,
    updated_at: comment.updated_at || comment.updatedAt,
    isEdited: comment.isEdited || false,
    // Add compatibility aliases
    postId: comment.post_id || comment.postId,
    authorId: comment.author_id || comment.authorId,
    createdAt: comment.created_at || comment.createdAt,
    updatedAt: comment.updated_at || comment.updatedAt
  };
};

export type { ForumPost as ForumPostType, ForumComment as ForumCommentType };
