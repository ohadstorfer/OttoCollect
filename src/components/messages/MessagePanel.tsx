
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message, User } from '@/types';

interface MessagePanelProps {
  messages?: Message[];
  currentUserId?: string;
  recipientId?: string;
  recipientData?: Partial<User>;
  isLoading?: boolean;
  onSendMessage?: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<boolean>;
  referenceItemId?: string;
}

const MessagePanel: React.FC<MessagePanelProps> = ({ 
  messages = [], 
  currentUserId,
  recipientId, 
  recipientData,
  isLoading = false,
  onSendMessage,
  referenceItemId 
}) => {
  const { user } = useAuth();
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use provided messages if available, otherwise fetch our own
  useEffect(() => {
    if (messages && messages.length > 0) {
      setLocalMessages(messages);
    } else if (currentUserId && recipientId && !onSendMessage) {
      // Only fetch our own messages if we're not being provided messages and a send handler
      fetchMessages();
    }
  }, [messages, currentUserId, recipientId, onSendMessage]);

  useEffect(() => {
    // Scroll to the bottom when messages change
    scrollToBottom();
  }, [localMessages, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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
      
      // Add alias properties for compatibility
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      createdAt: msg.created_at
    }));
      
    setLocalMessages(formattedMessages);
  };

  const handleSendMessage = async () => {
    if ((!user && !currentUserId) || !newMessage.trim() || (!recipientId && !onSendMessage)) return;
    
    const userId = currentUserId || user?.id;
    if (!userId) return;

    if (onSendMessage) {
      // Use the provided send function if available, ensuring the message has the correct type
      await onSendMessage({
        sender_id: userId,
        receiver_id: recipientId || '',
        content: newMessage.trim(),
        isRead: false,
        reference_item_id: referenceItemId,
        created_at: new Date().toISOString() // Add created_at field that was missing
      });
      setNewMessage('');
    } else {
      // Otherwise, handle sending ourselves
      const messageData = {
        sender_id: userId,
        receiver_id: recipientId || '',
        content: newMessage.trim(),
        is_read: false,
        reference_item_id: referenceItemId || null,
      };

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setNewMessage('');
        fetchMessages();
      }
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

  // Determine which messages to display
  const displayMessages = messages && messages.length > 0 ? messages : localMessages;
  const effectiveUserId = currentUserId || user?.id;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!recipientId && !recipientData ? (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-muted-foreground">Select a conversation to view messages</p>
        </div>
      ) : (
        <>
          <div className="overflow-y-auto flex-grow p-4">
            {displayMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              displayMessages.map((message) => (
                <div key={message.id} className="mb-4">
                  {(message.sender_id === effectiveUserId || message.senderId === effectiveUserId) ? (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[80%]">
                        <div>{message.content}</div>
                        <div className="text-xs opacity-70 text-right mt-1">
                          {formatDate(message)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg max-w-[80%]">
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

          <div className="p-4 border-t">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Enter your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage}><Send className="h-4 w-4 mr-2" />Send</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MessagePanel;
