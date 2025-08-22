
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { getUnreadMessagesCount } from '@/services/messageService';
import { subscribeToMessages } from '@/services/messageService';
import { useTranslation } from 'react-i18next';

interface MessageButtonProps {
  userId?: string;
  onClick: () => void;
}

export function MessageButton({ userId, onClick }: MessageButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation(['messaging']);
  
  // Fetch initial unread count and subscribe to new messages
  useEffect(() => {
    if (!userId) return;
    
    // Get initial count
    const fetchUnreadCount = async () => {
      const count = await getUnreadMessagesCount(userId);
      setUnreadCount(count);
    };
    
    fetchUnreadCount();
    
    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(userId, () => {
      setUnreadCount(prev => prev + 1);
    });
    
    return () => {
      unsubscribe();
    };
  }, [userId]);
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className="relative"
    >
      <MessageSquare className="h-5 w-5" />
      <span className="sr-only">{t('button.messages')}</span>
      
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
