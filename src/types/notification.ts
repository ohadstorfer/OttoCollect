
export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'forum_post' | 'collection_activity' | 'follow';
  title: string;
  content: string;
  reference_id?: string;
  reference_data?: {
    sender_id?: string;
    sender_username?: string;
    follower_id?: string;
    follower_username?: string;
    active_user_id?: string;
    active_username?: string;
    items_added?: number;
    items_updated?: number;
    activity_date?: string;
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
}
