
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message } from '@/types';

interface MessagePanelProps {
  receiverId: string;
  referenceItemId?: string;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({ receiverId, referenceItemId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchInitialMessages = async () => {
      const initialMessages = await fetchMessages();
      setMessages(initialMessages);
    };

    fetchInitialMessages();

    // Set up subscription for new messages
    const messageSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
        const updatedMessages = await fetchMessages();
        setMessages(updatedMessages);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [user, receiverId, referenceItemId]);

  useEffect(() => {
    // Scroll to the bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${receiverId}`)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
      
    // Map the database fields to the Message interface
    return data.map(msg => ({
      ...msg,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      createdAt: msg.created_at,
      isRead: msg.is_read // Make sure this property is correctly mapped
    })) as Message[];
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const messageData = {
      sender_id: user.id,
      receiver_id: receiverId,
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
      const updatedMessages = await fetchMessages();
      setMessages(updatedMessages);
    }
  };

  const formatDate = (message: Message) => {
    try {
      const messageDate = new Date(message.createdAt || message.created_at);
      return format(messageDate, 'MMM d, h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto flex-grow p-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.sender_id === user?.id ? (
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
        ))}
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
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage}><Send className="h-4 w-4 mr-2" />Send</Button>
        </div>
      </div>
    </div>
  );
};

export default MessagePanel;
