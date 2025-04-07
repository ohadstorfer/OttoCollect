
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  referenceItemId?: string | null;
  createdAt: string;
}
