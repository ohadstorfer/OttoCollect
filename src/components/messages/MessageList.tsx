import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Conversation } from '@/types/message';

interface MessageListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (userId: string) => void;
}

export function MessageList({ 
  conversations, 
  activeConversationId, 
  isLoading, 
  onSelectConversation 
}: MessageListProps) {
  
  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }
  
  if (conversations.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-muted-foreground mb-2">No conversations yet</div>
        <p className="text-sm text-muted-foreground">
          Your messages with other collectors will appear here
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        {conversations.map(conversation => {
          // Hide unread count if this is the active conversation
          const showUnreadCount = conversation.unreadCount > 0 && conversation.otherUserId !== activeConversationId;
          
          return (
            <div 
              key={conversation.otherUserId}
              className={`w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent/20 transition-colors text-left mb-1
                ${activeConversationId === conversation.otherUserId ? 'bg-accent/30' : showUnreadCount ? 'bg-muted/50' : ''}
              `}
            >
              <Link 
                to={`/profile/${conversation.otherUserId}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              >
                <Avatar className="h-10 w-10 border bg-card hover:ring-2 hover:ring-ottoman-500 transition-all">
                  <AvatarImage src={conversation.otherUser.avatarUrl || ''} />
                  <AvatarFallback className="bg-ottoman-700 text-parchment-100">
                    {conversation.otherUser.username ? getInitials(conversation.otherUser.username) : '??'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              
              <button
                onClick={() => onSelectConversation(conversation.otherUserId)}
                className="flex-1 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">
                    {conversation.otherUser.username}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                    {conversation.lastMessage.senderId === conversation.otherUserId ? '' : 'You: '}
                    {conversation.lastMessage.content}
                  </p>
                  
                  {showUnreadCount && (
                    <Badge variant="default" className="ml-2 bg-ottoman-500">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
