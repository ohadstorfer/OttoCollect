import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar, User } from 'lucide-react';
import { Conversation, Message } from '@/types/message';
import { useAuth } from '@/context/AuthContext';
import { useDateLocale } from '@/lib/dateUtils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

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

  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatRelativeTime } = useDateLocale();
  const { t } = useTranslation(['messaging']);
  const { direction } = useLanguage();

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
        <div className="text-muted-foreground mb-2">{t('list.noConversations')}</div>
        <p className="text-sm text-muted-foreground">
          {t('list.noConversationsDescription')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        {conversations
          // Filter out temporary conversations if there's a real one with the same user
          .filter(conversation => {
            if (conversation.lastMessage.id === 'temp') {
              return !conversations.some(c =>
                c.lastMessage.id !== 'temp' && (
                  c.otherUserId === conversation.otherUserId ||
                  c.lastMessage.senderId === conversation.otherUserId ||
                  c.lastMessage.recipientId === conversation.otherUserId
                )
              );
            }
            return true;
          })
          .map(conversation => {
            // Hide unread count if this is the active conversation
            const showUnreadCount = conversation.unreadCount > 0 && conversation.otherUserId !== activeConversationId;

            return (
              <div
                key={conversation.otherUserId}
                className={`w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent/20 transition-colors mb-1
                      ${activeConversationId === conversation.otherUserId ? 'bg-accent/30' : showUnreadCount ? 'bg-muted/50' : ''}
                      ${conversation.lastMessage.id === 'temp' ? 'border-2 border-primary/50 bg-primary/5' : ''}
                      ${direction === 'rtl' ? 'flex-row-reverse' : 'flex-row'}
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
                  className={`flex-1 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-center ${direction === 'rtl' ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
                    <span className="font-medium truncate">
                      {conversation.otherUser.username}
                    </span>
                    <span
                      className={`text-xs text-muted-foreground whitespace-nowrap ${direction === 'rtl' ? 'ml-2' : 'ml-2'}`}
                    >
                      {formatRelativeTime(new Date(conversation.lastMessage.createdAt))}
                    </span>
                  </div>

                  <div className={`flex items-center mt-1 ${direction === 'rtl' ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
                    {showUnreadCount && (
                      <Badge
                        variant="default"
                        className={`${direction === 'rtl' ? 'mr-2' : 'ml-2'} bg-ottoman-500`}
                      >
                        {conversation.unreadCount}
                      </Badge>
                    )}
                    <p
  className={`text-sm text-muted-foreground truncate max-w-[180px] ${
    direction === 'rtl' ? 'text-right' : 'text-left'
  }`}
>
  {conversation.lastMessage.senderId === conversation.otherUserId ? (
    conversation.lastMessage.content
  ) : direction === 'rtl' ? (
    `${conversation.lastMessage.content} :${t('list.youPrefix')}`
  ) : (
    `${t('list.youPrefix')}: ${conversation.lastMessage.content}`
  )}
</p>
                  </div>
                </button>
              </div>

            );
          })}
      </div>
    </ScrollArea>
  );
}
