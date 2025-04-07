
export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: string;
  };
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: string;
  };
  imageUrls: string[];
  comments?: ForumComment[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}
