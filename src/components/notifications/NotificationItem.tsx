
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Notification } from '@/types/notification';
import { getInitials } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Users, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'follow':
        return <Users className="h-4 w-4" />;
      case 'collection_activity':
        return <User className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        navigate('/messaging');
        break;
      case 'follow':
        if (notification.reference_data?.follower_username) {
          navigate(`/profile/${notification.reference_data.follower_username}`);
        }
        break;
      case 'collection_activity':
        if (notification.reference_data?.active_username) {
          navigate(`/profile/${notification.reference_data.active_username}`);
        }
        break;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notification.is_read ? 'bg-background' : 'bg-muted/50'
      } hover:bg-muted/70`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-1">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium truncate">{notification.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{notification.content}</p>
          </div>
          
          {!notification.is_read && (
            <div className="flex-shrink-0 ml-2">
              <div className="w-2 h-2 bg-ottoman-500 rounded-full"></div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
          
          {notification.type === 'collection_activity' && notification.reference_data && (
            <div className="flex gap-1">
              {notification.reference_data.items_added && notification.reference_data.items_added > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{notification.reference_data.items_added}
                </Badge>
              )}
              {notification.reference_data.items_updated && notification.reference_data.items_updated > 0 && (
                <Badge variant="outline" className="text-xs">
                  ~{notification.reference_data.items_updated}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
