import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, MessageCircle, UserPlus, BookOpen, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification, notificationService } from '@/services/notificationService';
import { Separator } from '@/components/ui/separator';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkAsRead: (notificationIds?: string[]) => void;
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const wasOpenRef = useRef(false);

  // Mark notifications as read only when panel is explicitly closed after being opened
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      // Only mark as read if the panel was previously open
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);
      if (unreadIds.length > 0) {
        onMarkAsRead(unreadIds);
      }
      wasOpenRef.current = false;
    }
  }, [open, notifications, onMarkAsRead]);

  const handleNotificationClick = (notification: Notification) => {
    const link = notificationService.getNotificationLink(notification);
    navigate(link);
    onOpenChange(false);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return MessageCircle;
      case 'follow':
        return UserPlus;
      case 'collection_activity':
        return BookOpen;
      case 'forum_post':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  // Group notifications by read status
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const IconComponent = getNotificationIcon(notification.type);
    return (
      <div
        key={notification.id}
        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border ${
          notification.is_read
            ? 'bg-background hover:bg-accent/50 border-muted'
            : 'bg-accent/30 hover:bg-accent/40 border-accent shadow-sm'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex-shrink-0">
          <div className={`h-8 w-8 rounded-full bg-background flex items-center justify-center ${
            notification.is_read ? 'text-muted-foreground' : 'text-primary'
          }`}>
            <IconComponent className="h-4 w-4" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            notification.is_read ? 'text-muted-foreground' : 'text-foreground'
          }`}>
            {notification.title}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.content}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notification.is_read && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-muted mt-2 pb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>

          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unread notifications section */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-medium text-primary">New</h3>
                    <div className="h-5 px-2 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center">
                      {unreadNotifications.length}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {unreadNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator between unread and read notifications */}
              {unreadNotifications.length > 0 && readNotifications.length > 0 && (
                <Separator className="my-4" />
              )}

              {/* Read notifications section */}
              {readNotifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Earlier</h3>
                  <div className="space-y-2">
                    {readNotifications.map((notification) => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
