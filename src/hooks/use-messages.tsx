import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/types';

const useMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
        
      // Transform the data to include the alias properties
      return data.map(msg => ({
        ...msg,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        createdAt: msg.created_at
      })) as Message[];
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
      setError('Failed to load messages.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: Omit<Message, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            content: message.content,
            is_read: false,
            reference_item_id: message.reference_item_id,
          },
        ])
        .select('*');

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      setMessages((prevMessages) => [...prevMessages, ...data]);
      return true;
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);

      if (error) {
        console.error('Error marking message as read:', error);
        return false;
      }

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      return true;
    } catch (err) {
      console.error('Unexpected error marking message as read:', err);
      return false;
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
  };
};

export default useMessages;
