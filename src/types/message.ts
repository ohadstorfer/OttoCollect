
export interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  recipientId: string;
  isRead: boolean;
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
