
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';

interface NotificationBellProps {
  userId?: string;
  onClick: () => void;
}

export function NotificationBell({ userId, onClick }: NotificationBellProps) {
  const { unreadCount } = useNotifications(userId);

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className="relative"
    >
      <Bell className="h-5 w-5" />
      <span className="sr-only">Notifications</span>
      
      {unreadCount > 0 && (
        <Badge 
          variant="default" 
          className="absolute -top-2 -right-2 px-1.5 min-w-[18px] h-[18px] text-[10px] bg-ottoman-500 flex items-center justify-center"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}
