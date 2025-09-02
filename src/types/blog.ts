export interface BlogPost {
  id: string;
  title: string;
  title_ar?: string;
  title_tr?: string;
  content: string;
  content_ar?: string;
  content_tr?: string;
  excerpt: string;
  excerpt_ar?: string;
  excerpt_tr?: string;
  main_image_url: string;
  author_id: string;
  authorId?: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  created_at: string;
  updated_at: string;
  commentCount?: number;
  comments?: BlogComment[];
  
  // Compatibility aliases to handle both naming conventions
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogComment {
  id: string;
  post_id: string;
  content: string;
  content_ar?: string;
  content_tr?: string;
  author_id: string;
  original_language?: string;
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

export interface BlogPostWithAuthor extends BlogPost {
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    rank: string;
  };
}

export interface BlogCommentWithAuthor extends BlogComment {
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    rank: string;
  };
}

// Helper function to normalize blog post data
export const normalizeBlogPost = (post: any): BlogPost => {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    main_image_url: post.main_image_url,
    author_id: post.author_id || post.authorId,
    author: post.author,
    created_at: post.created_at || post.createdAt,
    updated_at: post.updated_at || post.updatedAt,
    commentCount: post.commentCount || 0,
    // Add compatibility aliases
    authorId: post.author_id || post.authorId,
    createdAt: post.created_at || post.createdAt,
    updatedAt: post.updated_at || post.updatedAt
  };
};

// Helper function to normalize blog comment data
export const normalizeBlogComment = (comment: any): BlogComment => {
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

export type { BlogPost as BlogPostType, BlogComment as BlogCommentType };