
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  referenceItemId?: string | null;
  createdAt: string;
}

export interface Conversation {
  otherUserId: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    rank: string;
  };
  lastMessage: Message;
  messages: Message[];
  unreadCount: number;
}
