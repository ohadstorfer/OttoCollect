import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message, User } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface MessagePanelProps {
  messages?: Message[];
  currentUserId?: string;
  recipientId?: string;
  recipientData?: Partial<User>;
  isLoading?: boolean;
  onSendMessage?: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<boolean>;
  referenceItemId?: string;
  hasReachedDailyLimit?: boolean;
  isLimitedRank?: boolean;
}

const MessagePanel: React.FC<MessagePanelProps> = ({ 
  messages = [], 
  currentUserId,
  recipientId, 
  recipientData,
  isLoading = false,
  onSendMessage,
  referenceItemId,
  hasReachedDailyLimit = false,
  isLimitedRank = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (messages && messages.length > 0) {
      setLocalMessages(messages);
    } else if (currentUserId && recipientId && !onSendMessage) {
      fetchMessages();
    }
  }, [messages, currentUserId, recipientId, onSendMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!user || !recipientId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),` +
        `and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }
    const formattedMessages: Message[] = data.map(msg => ({
      id: msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      created_at: msg.created_at,
      isRead: msg.is_read,
      reference_item_id: msg.reference_item_id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      createdAt: msg.created_at
    }));
    setLocalMessages(formattedMessages);
  };

  const handleSendMessage = async () => {
    if ((!user && !currentUserId) || !newMessage.trim() || (!recipientId && !onSendMessage)) return;
    
    // Check if user has reached daily limit
    if (isLimitedRank && hasReachedDailyLimit) {
      toast({
        title: "Daily Limit Reached",
        description: "You have reached your daily limit of 6 messages.",
        variant: "destructive"
      });
      return;
    }
    
    const userId = currentUserId || user?.id;
    if (!userId) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      if (onSendMessage) {
        const success = await onSendMessage({
          sender_id: userId,
          receiver_id: recipientId || '',
          content: messageContent,
          isRead: false,
          reference_item_id: referenceItemId,
          created_at: new Date().toISOString()
        });
        
        if (!success) {
          // Restore message if failed
          setNewMessage(messageContent);
          toast({
            title: "Failed to Send",
            description: "Your message could not be sent. Please try again.",
            variant: "destructive"
          });
        } else {
          // Focus back to input for continued typing
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      } else {
        const messageData = {
          sender_id: userId,
          receiver_id: recipientId || '',
          content: messageContent,
          is_read: false,
          reference_item_id: referenceItemId || null,
        };

        const { error } = await supabase
          .from('messages')
          .insert([messageData]);

        if (error) {
          console.error('Error sending message:', error);
          // Restore message if failed
          setNewMessage(messageContent);
          toast({
            title: "Failed to Send",
            description: "Your message could not be sent. Please try again.",
            variant: "destructive"
          });
        } else {
          fetchMessages();
          // Focus back to input for continued typing
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if failed
      setNewMessage(messageContent);
      toast({
        title: "Failed to Send",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatDate = (message: Message) => {
    try {
      const messageDate = new Date(message.created_at || message.createdAt || '');
      return format(messageDate, 'MMM d, h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  const displayMessages = messages && messages.length > 0 ? messages : localMessages;
  const effectiveUserId = currentUserId || user?.id;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`${i % 2 === 0 ? 'bg-primary/20' : 'bg-muted'} p-3 rounded-lg w-2/3 h-16`} />
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
            <div className="w-10 h-10 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {!recipientId && !recipientData ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground">Select a conversation to view messages</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              displayMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`mb-4 transition-opacity duration-200 ${
                    message.id.toString().startsWith('temp-') ? 'opacity-70' : 'opacity-100'
                  }`}
                >
                  {(message.sender_id === effectiveUserId || message.senderId === effectiveUserId) ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%] break-words">
                        <div>{message.content}</div>
                        <div className="text-xs opacity-70 text-right mt-1">
                          {formatDate(message)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg max-w-[80%] break-words">
                        <div>{message.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {formatDate(message)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Daily activity warning for limited ranks */}
          {isLimitedRank && hasReachedDailyLimit && (
            <div className="mb-4 text-center">
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  You have reached your daily limit of 6 messages.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 p-4 border-t">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Enter your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLimitedRank && hasReachedDailyLimit}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={(isLimitedRank && hasReachedDailyLimit) || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MessagePanel;
