
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, MessageCircle, UserPlus, BookOpen, MessageSquare, Trophy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification, notificationService } from '@/services/notificationService';
import { Separator } from '@/components/ui/separator';
import { BadgeDisplay } from '@/components/badges/BadgeDisplay';
import { useDateLocale } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkAsRead: (notificationIds?: string[]) => void;
  trigger?: React.ReactNode;
}

export function NotificationPanel({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  trigger
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const wasOpenRef = useRef(false);
  const { formatRelativeTime } = useDateLocale();
  const { t } = useTranslation(['notification']);
  const { currentLanguage, direction } = useLanguage();

  // Helper function to get translated text based on current language
  const getTranslatedText = (notification: Notification, field: 'title' | 'content'): string => {
    if (currentLanguage === 'ar') {
      return field === 'title' 
        ? notification.title_ar || notification.title
        : notification.content_ar || notification.content;
    } else if (currentLanguage === 'tr') {
      return field === 'title' 
        ? notification.title_tr || notification.title
        : notification.content_tr || notification.content;
    }
    return field === 'title' ? notification.title : notification.content;
  };

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
    console.log('Notification clicked:', notification);
    console.log('Notification type:', notification.type);
    console.log('Reference ID:', notification.reference_id);
    console.log('Reference data:', notification.reference_data);
    
    const link = notificationService.getNotificationLink(notification);
    console.log('Generated link:', link);
    
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
      case 'blog_post':
        return BookOpen;
      case 'badge_earned':
      case 'badge_achievement':
        return Trophy;
      default:
        return Bell;
    }
  };

  // Group notifications by read status
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const IconComponent = getNotificationIcon(notification.type);
    const isBadgeNotification = notification.type === 'badge_earned' || notification.type === 'badge_achievement';
    const badgeData = isBadgeNotification ? notification.reference_data : null;
    
    // Get translated text based on current language
    const translatedTitle = getTranslatedText(notification, 'title');
    const translatedContent = getTranslatedText(notification, 'content');

    return (
      <div
        key={notification.id}
        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] border ${
          notification.is_read
            ? 'bg-background hover:bg-accent/50 border-muted'
            : 'bg-accent/30 hover:bg-accent/40 border-accent shadow-sm'
        } ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
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
          <div className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <p className={`text-sm font-medium ${
              notification.is_read 
                ? 'text-muted-foreground' 
                : 'text-foreground'
            } ${direction === 'rtl' ? 'text-right' : ''}`}>
              {translatedTitle}
            </p>
          </div>
          <div className={`flex items-center gap-2 mt-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <p className={`text-sm text-muted-foreground line-clamp-2 ${direction === 'rtl' ? 'text-right' : ''}`}>
              {translatedContent}
            </p>
            {isBadgeNotification && badgeData && (
              <BadgeDisplay
                badge={{
                  id: badgeData.badge_id,
                  name: badgeData.badge_name,
                  stage: badgeData.badge_stage as 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5',
                  icon_url: `/badges/${badgeData.badge_stage}.png`,
                  category: ''
                }}
                size="sm"
              />
            )}
          </div>
          <p className={`text-xs text-muted-foreground mt-1 ${direction === 'rtl' ? 'text-right' : ''}`}>
            {formatRelativeTime(new Date(notification.created_at))}
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
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={`w-[380px] p-4 mt-2 ${direction === 'rtl' ? 'text-right' : ''}`}
        sideOffset={8}
      >
        <div className={`flex items-center justify-between border-b border-muted pb-2 mb-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <Bell className="h-5 w-5" />
            <h2 className={`text-lg font-semibold ${direction === 'rtl' ? 'text-right' : ''}`}> <span> {t('notifications')} </span> </h2>
          </div>
          {unreadNotifications.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkAsRead();
              }}
              className={`text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
            >
              <CheckCheck className="h-4 w-4" />
              {t('markAllAsRead')}
            </button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-[200px] text-muted-foreground ${direction === 'rtl' ? 'text-right' : ''}`}>
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className={direction === 'rtl' ? 'text-right' : ''}>{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unread notifications section */}
              {unreadNotifications.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 mb-3 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`text-sm font-medium text-primary ${direction === 'rtl' ? 'text-right' : ''}`}> <span> {t('new')} </span> </h3>
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
                  <h3 className={`text-sm font-medium text-muted-foreground mb-3 ${direction === 'rtl' ? 'text-right' : ''}`}> <span> {t('earlier')} </span> </h3>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
