
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  image_urls?: string[];
}

export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean; // Make this property optional with default false
}

export interface Author {
  id: string;
  username: string;
  avatar_url?: string;
  rank?: string;
}

export interface ForumPostWithAuthor extends ForumPost {
  author: Author;
  comment_count?: number;
}

export interface ForumCommentWithAuthor extends ForumComment {
  author: Author;
}
