import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'forum_post' | 'collection_activity' | 'follow';
  title: string;
  content: string;
  reference_id: string | null;
  reference_data: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  // Get all notifications for the current user
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Notification[];
  },

  // Get unread notifications count
  async getUnreadCount() {
    const { data, error } = await supabase
      .rpc('get_unread_notifications_count');

    if (error) throw error;
    return data as number;
  },

  // Mark specific notifications as read
  async markAsRead(notificationIds: string[]) {
    const { error } = await supabase
      .rpc('mark_notifications_as_read', { notification_ids: notificationIds });

    if (error) throw error;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const { error } = await supabase
      .rpc('mark_notifications_as_read', { notification_ids: null });

    if (error) throw error;
  },

  // Subscribe to new notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  },

  // Navigate to the relevant page based on notification type
  getNotificationLink(notification: Notification): string {
    switch (notification.type) {
      case 'message':
        return `/messages`;
      case 'follow':
        return `/profile/${notification.reference_data?.follower_username}`;
      case 'collection_activity':
        return `/profile/${notification.reference_data?.active_username}`;
      case 'forum_post':
        return `/forum/post/${notification.reference_id}`;
      default:
        return '/';
    }
  }
}; 