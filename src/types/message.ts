
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  referenceItemId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  otherUserId: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank: string;
  };
  lastMessage: Message;
  unreadCount: number;
}
