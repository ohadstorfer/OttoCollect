
import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatRelative } from 'date-fns';
import { Message } from '@/types';
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface MessagePanelProps {
  messages: Message[];
  currentUserId?: string;
  recipientId: string | null;
  recipientData?: {
    username?: string;
    avatarUrl?: string;
  };
  isLoading: boolean;
  onSendMessage: (receiverId: string, content: string) => Promise<any>;
}

export function MessagePanel({ 
  messages, 
  currentUserId, 
  recipientId, 
  recipientData,
  isLoading, 
  onSendMessage
}: MessagePanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !recipientId) return;
    
    setIsSending(true);
    try {
      await onSendMessage(recipientId, newMessage);
      setNewMessage('');
    } finally {
      setIsSending(false);
    }
  };

  // Handle enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Group messages by date for better UI organization
  const groupMessagesByDate = () => {
    const groups: {date: string, messages: Message[]}[] = [];
    let currentDate = '';
    
    messages.forEach(message => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          messages: [message]
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };
  
  const messageGroups = groupMessagesByDate();
  
  // Show empty state if no conversation selected
  if (!recipientId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
        <p className="text-sm text-muted-foreground">
          Choose a conversation from the list to start chatting
        </p>
      </div>
    );
  }
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-muted text-xs font-medium">
            Loading messages...
          </div>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex items-start gap-2 mb-4 ${i % 2 === 0 ? 'justify-end' : ''}`}>
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-lg`} />
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Message List */}
      <ScrollArea className="flex-1 p-4">
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-6">
            {/* Date Header */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-muted text-xs font-medium">
                {formatRelative(new Date(group.date), new Date()).split('at')[0]}
              </div>
            </div>
            
            {/* Messages */}
            {group.messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div className={`flex items-start max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    {!isCurrentUser && (
                      <Link to={`/profile/${message.senderId}`}>
                        <Avatar className="h-8 w-8 mr-2 cursor-pointer hover:ring-2 hover:ring-ottoman-500 transition-all">
                          {recipientData?.avatarUrl ? (
                            <AvatarImage src={recipientData.avatarUrl} alt={recipientData.username || "User"} />
                          ) : (
                            <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-xs">
                              {recipientData?.username ? getInitials(recipientData.username) : "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </Link>
                    )}
                    
                    <div className={`
                      px-4 py-2 rounded-lg 
                      ${isCurrentUser 
                        ? 'bg-ottoman-600 text-parchment-100 rounded-tr-none ml-2' 
                        : 'bg-card border rounded-tl-none'
                      }
                    `}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p className="text-[10px] mt-1 opacity-70 text-right">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      {/* Message Input */}
      <div className="p-4 border-t bg-card">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isSending || !newMessage.trim()}
            className="h-[60px] w-[60px]"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
