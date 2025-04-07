
import { UserRank } from "./profile";

export interface ForumPostAuthor {
  id: string;
  username: string;
  avatarUrl?: string;
  rank: UserRank;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: UserRank;
  };
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: ForumPostAuthor;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
  comments?: ForumComment[];
}
