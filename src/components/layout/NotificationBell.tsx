import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from '@/components/layout/NotificationPanel';
import { Notification, notificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';



export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      try {
        const [notifs, count] = await Promise.all([
          notificationService.getNotifications(),
          notificationService.getUnreadCount()
        ]);
        setNotifications(notifs);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      }
    };

    loadNotifications();

    // Subscribe to real-time notifications
    if (user) {
      const subscription = notificationService.subscribeToNotifications(
        user.id,
        (newNotification) => {
          setNotifications(prev => [newNotification, ...prev]);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const handleMarkAsRead = async (notificationIds?: string[]) => {
    if (!user) return;
    
    try {
      if (notificationIds && notificationIds.length > 0) {
        await notificationService.markAsRead(notificationIds);
        setNotifications(prev =>
          prev.map(n => notificationIds.includes(n.id) ? { ...n, is_read: true } : n)
        );
      } else {
        await notificationService.markAllAsRead();
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  if (!user) return null;

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label="Open notifications"
    >
      <Bell className={`h-5 w-5 ${theme === 'light' ? 'text-ottoman-700' : 'text-ottoman-100'}`} />
      {unreadCount > 0 && (
        <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </Badge>
      )}
    </Button>
  );

  return (
    <NotificationPanel
      open={isOpen}
      onOpenChange={setIsOpen}
      notifications={notifications}
      onMarkAsRead={handleMarkAsRead}
      trigger={trigger}
    />
  );
}
