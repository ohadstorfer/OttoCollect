
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  createdAt:string;
  updated_at: string;
  image_urls?: string[];
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  commentCount?: number;
}

export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
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

export interface ImageSuggestion {
  id: string;
  banknote_id: string;
  user_id: string;
  image_url: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}
