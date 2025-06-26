
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';

export const getNotifications = async (userId: string, limit: number = 20): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('get_unread_notifications_count', { user_id_param: userId });

  if (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }

  return data || 0;
};

export const markNotificationsAsRead = async (userId: string, notificationIds?: string[]): Promise<void> => {
  const { error } = await supabase
    .rpc('mark_notifications_as_read', { 
      user_id_param: userId, 
      notification_ids: notificationIds || null 
    });

  if (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const generateCollectionActivityNotifications = async (): Promise<void> => {
  const { error } = await supabase
    .rpc('generate_collection_activity_notifications');

  if (error) {
    console.error('Error generating collection activity notifications:', error);
    throw error;
  }
};
