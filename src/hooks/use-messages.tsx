
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Message } from '@/types';

const useMessages = (userId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchMessages();
      fetchConversations();
    }
  }, [userId]);

  const fetchMessages = async () => {
    if (!userId) return [];
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
        
      // Transform the data to include the alias properties
      const transformedMessages = data.map(msg => ({
        ...msg,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        createdAt: msg.created_at,
        isRead: msg.is_read
      })) as Message[];
      
      setMessages(transformedMessages);
      return transformedMessages;
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
      setError('Failed to load messages.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Get all messages
      const allMessages = await fetchMessages();
      
      // Extract unique conversation partners
      const conversationUsers = new Map();
      
      allMessages.forEach(msg => {
        if (msg.sender_id === userId) {
          if (!conversationUsers.has(msg.receiver_id)) {
            conversationUsers.set(msg.receiver_id, {
              lastMessage: msg,
              unreadCount: 0
            });
          }
        } else {
          if (!conversationUsers.has(msg.sender_id)) {
            conversationUsers.set(msg.sender_id, {
              lastMessage: msg,
              unreadCount: msg.isRead ? 0 : 1
            });
          } else {
            if (!msg.isRead) {
              const current = conversationUsers.get(msg.sender_id);
              conversationUsers.set(msg.sender_id, {
                ...current,
                unreadCount: current.unreadCount + 1
              });
            }
          }
        }
      });
      
      // Fetch user details for each conversation partner
      const conversationList = await Promise.all(
        Array.from(conversationUsers.entries()).map(async ([partnerId, data]) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, username, rank, avatar_url')
            .eq('id', partnerId)
            .single();
          
          return {
            otherUserId: partnerId,
            otherUser: userData,
            lastMessage: data.lastMessage,
            unreadCount: data.unreadCount
          };
        })
      );
      
      // Sort by latest message first
      conversationList.sort((a, b) => {
        const dateA = new Date(a.lastMessage.created_at);
        const dateB = new Date(b.lastMessage.created_at);
        return dateB.getTime() - dateA.getTime();
      });
      
      setConversations(conversationList);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    setActiveConversation(otherUserId);
    setCurrentMessages([]);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error loading conversation:', error);
        return;
      }
      
      const transformedMessages = data.map(msg => ({
        ...msg,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        createdAt: msg.created_at,
        isRead: msg.is_read
      })) as Message[];
      
      setCurrentMessages(transformedMessages);
      
      // Mark messages as read
      const unreadMessages = data
        .filter(msg => msg.receiver_id === userId && !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages);
        
        // Refresh conversations to update unread count
        fetchConversations();
      }
    } catch (err) {
      console.error('Error in loadMessages:', err);
    }
  };

  const sendMessage = async (content: string) => {
    if (!userId || !activeConversation || !content.trim()) {
      return false;
    }
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: userId,
            receiver_id: activeConversation,
            content: content.trim(),
            is_read: false
          }
        ])
        .select('*');
        
      if (error) {
        console.error('Error sending message:', error);
        return false;
      }
      
      if (data && data.length > 0) {
        // Add the new message to the current messages
        const newMsg = {
          ...data[0],
          senderId: data[0].sender_id,
          receiverId: data[0].receiver_id,
          createdAt: data[0].created_at,
          isRead: data[0].is_read
        } as Message;
        
        setCurrentMessages(prev => [...prev, newMsg]);
        
        // Refresh conversations list
        fetchConversations();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error in sendMessage:', err);
      return false;
    }
  };

  return {
    messages,
    currentMessages,
    loading,
    isLoading,
    error,
    conversations,
    activeConversation,
    fetchMessages,
    loadMessages,
    sendMessage,
    setActiveConversation
  };
};

export default useMessages;
