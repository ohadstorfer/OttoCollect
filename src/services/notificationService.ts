
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  type: 'message' | 'forum_post' | 'collection_activity' | 'follow' | 'badge_earned' | 'badge_achievement' | 'blog_post';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Notification[];
  },

  // Get unread notifications count
  async getUnreadCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  // Mark specific notifications as read
  async markAsRead(notificationIds: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('mark_notifications_as_read', {
      user_id_param: user.id,
      notification_ids: notificationIds
    });

    if (error) throw error;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.rpc('mark_notifications_as_read', {
      user_id_param: user.id,
      notification_ids: null
    });

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
    console.log('getNotificationLink called for:', notification.type);
    console.log('Reference ID:', notification.reference_id);
    console.log('Reference data:', notification.reference_data);
    
    switch (notification.type) {
      case 'message':
        // For message notifications, navigate directly to the conversation with the sender
        const senderId = notification.reference_data?.sender_id;
        return senderId ? `/messaging/${senderId}` : '/messaging';
      case 'follow':
        return `/profile/${notification.reference_data?.follower_username}`;
      case 'collection_activity':
        return `/profile/${notification.reference_data?.active_username}`;
      case 'forum_post':
        return `/community/forum/post/${notification.reference_id}`;
      case 'blog_post':
        return `/blog/${notification.reference_id}`;
      case 'badge_earned':
      case 'badge_achievement':
        // For badge notifications, navigate to user profile with badges parameter
        const username = notification.reference_data?.recipient_username;
        return username ? `/profile/${username}?showBadges=true` : '/';
      default:
        return '/';
    }
  }
};
