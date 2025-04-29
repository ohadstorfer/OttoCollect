
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  isRead: boolean;
  reference_item_id?: string;
  
  // Alias properties for compatibility
  senderId?: string;
  receiverId?: string;
  createdAt?: string;
}
