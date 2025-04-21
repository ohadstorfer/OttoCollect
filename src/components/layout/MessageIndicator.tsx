
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare } from 'lucide-react';
import { getUnreadMessagesCount, subscribeToMessages } from '@/services/messageService';
import { useState, useEffect } from 'react';

export function MessageIndicator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Only show if user is logged in and not already on messaging page
  if (!user || location.pathname === '/messaging') {
    return null;
  }

  // Subscribe to new messages and get initial count
  useEffect(() => {
    if (!user) return;
    
    // Get initial count
    const fetchUnreadCount = async () => {
      const count = await getUnreadMessagesCount(user.id);
      setUnreadCount(count);
    };
    
    fetchUnreadCount();
    
    // Subscribe to new messages
    const unsubscribe = subscribeToMessages(user.id, () => {
      setUnreadCount(prev => prev + 1);
    });
    
    return () => {
      unsubscribe();
    };
  }, [user]);
  
  // Only render the badge if there are unread messages
  if (unreadCount <= 0) {
    return null;
  }
  
  return (
    <Badge 
      variant="default" 
      className="absolute -top-2 -right-2 px-1.5 min-w-[18px] h-[18px] text-[10px] bg-ottoman-500 flex items-center justify-center"
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}
