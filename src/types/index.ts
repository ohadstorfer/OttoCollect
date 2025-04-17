
// Remove duplicate isRead declaration and consolidate
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  isRead: boolean;
  reference_item_id?: string;
}

// Add explicit UserRank type
export type UserRank = 'Newbie' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Super Collector';
