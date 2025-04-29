
export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[];
  
  // Joined fields
  authorUsername?: string;
  authorAvatarUrl?: string;
  commentCount?: number;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  
  // Joined fields
  authorUsername?: string;
  authorAvatarUrl?: string;
}

export interface ForumThread {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  
  // Joined fields
  authorUsername?: string;
  authorAvatarUrl?: string;
  replyCount?: number;
}

export interface ForumReply {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  
  // Joined fields
  authorUsername?: string;
  authorAvatarUrl?: string;
}
