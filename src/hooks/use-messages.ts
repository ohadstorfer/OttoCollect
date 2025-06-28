import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';
import { Conversation } from '@/types/message';
import { useAuth } from '@/context/AuthContext';
import { getMessages, sendMessage as sendMessageService, markMessageAsRead, getUnreadMessagesCount, subscribeToMessages, checkUserDailyMessagingLimit } from '@/services/messageService';

interface UseMessagesReturn {
  messages: Message[];
  conversations: Conversation[];
  currentMessages: Message[];
  activeConversation: string | null;
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<boolean>;
  loadMessages: (userId: string) => Promise<void>;
  setActiveConversation: (userId: string | null) => void;
}

export default function useMessages(): UseMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build conversations from messages
  const buildConversations = useCallback(async (messagesData: Message[]) => {
    if (!user || messagesData.length === 0) {
      setConversations([]);
      return;
    }
    
    try {
      // Get unique conversation partners
      const conversationUsers = new Set<string>();
      messagesData.forEach(message => {
        if (message.sender_id === user.id) {
          conversationUsers.add(message.receiver_id);
        } else {
          conversationUsers.add(message.sender_id);
        }
      });
      
      // Fetch user information for each conversation partner
      const userIds = Array.from(conversationUsers);
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rank')
        .in('id', userIds);
        
      if (usersError) {
        console.error('Error fetching user profiles:', usersError);
        return;
      }
      
      // Build conversations list
      const conversationList: Conversation[] = userIds.map(userId => {
        const userMessages = messagesData.filter(msg => 
          msg.sender_id === userId || msg.receiver_id === userId
        );
        
        const lastMessage = userMessages.reduce((latest, current) => 
          new Date(current.created_at) > new Date(latest.created_at) ? current : latest
        );
        
        const unreadCount = userMessages.filter(msg => 
          msg.sender_id === userId && !msg.isRead
        ).length;
        
        const userData = usersData?.find(u => u.id === userId);
        
        return {
          otherUserId: userId,
          otherUser: {
            id: userId,
            username: userData?.username || 'Unknown User',
            avatarUrl: userData?.avatar_url,
            rank: userData?.rank || 'User',
          },
          lastMessage,
          unreadCount
        };
      });
      
      // Sort conversations by latest message
      conversationList.sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - 
        new Date(a.lastMessage.created_at).getTime()
      );
      
      setConversations(conversationList);
    } catch (err) {
      console.error('Error building conversations:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      setIsLoading(true);
      try {
        const fetchedMessages = await getMessages(user.id);
        setMessages(fetchedMessages);
        await buildConversations(fetchedMessages);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, async () => {
        const fetchedMessages = await getMessages(user.id);
        setMessages(fetchedMessages);
        await buildConversations(fetchedMessages);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, buildConversations]);

  // Fetch all messages for the current user
  const fetchAllMessages = useCallback(async () => {
    if (!user) return [];
    
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
        setError('Failed to load messages');
        return [];
      }
      
      // Transform the data to match our Message interface
      const transformedMessages: Message[] = data.map(msg => ({
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
      
      setMessages(transformedMessages);
      return transformedMessages;
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
      setError('Failed to load messages.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load messages for a specific user conversation
  const loadMessages = useCallback(async (userId: string) => {
    if (!user) return;
    
    setLoading(true);
    setActiveConversation(userId);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),` +
          `and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
        )
        .order('created_at');
        
      if (error) {
        console.error('Error fetching conversation:', error);
        setCurrentMessages([]);
        return;
      }
      
      // Transform to our Message interface
      const conversationMessages: Message[] = data.map(msg => ({
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
      
      setCurrentMessages(conversationMessages);
      
      // Mark received messages as read
      const unreadMsgIds = data
        .filter(msg => msg.sender_id === userId && !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMsgIds.length > 0) {
        await Promise.all(unreadMsgIds.map(id => markMessageAsRead(id)));
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a message with optimistic updates
  const sendMessage = async (message: Omit<Message, 'id' | 'createdAt'>) => {
    if (!user) return false;
    
    // Create a temporary message for optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      ...message,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false
    };

    // Optimistically update UI
    setCurrentMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const result = await sendMessageService(
        message.sender_id,
        message.receiver_id,
        message.content,
        message.reference_item_id
      );

      if (!result) {
        // Revert optimistic update on error
        setCurrentMessages(prev => prev.filter(msg => msg.id !== tempId));
        return false;
      }

      // Replace temporary message with real one
      setCurrentMessages(prev => 
        prev.map(msg => msg.id === tempId ? result : msg)
      );
      
      // Update all messages and conversations
      setMessages(prev => [result, ...prev]);
      await buildConversations([result, ...messages]);
      
      return true;
    } catch (err) {
      // Revert optimistic update on error
      setCurrentMessages(prev => prev.filter(msg => msg.id !== tempId));
      console.error('Unexpected error sending message:', err);
      return false;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const success = await markMessageAsRead(messageId);
      if (!success) {
        return false;
      }

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      setCurrentMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );

      return true;
    } catch (err) {
      console.error('Unexpected error marking message as read:', err);
      return false;
    }
  };

  // Initial load
  useEffect(() => {
    const loadAllMessages = async () => {
      const messagesData = await fetchAllMessages();
      await buildConversations(messagesData);
    };

    if (user) {
      loadAllMessages();
    }
  }, [user, fetchAllMessages, buildConversations]);

  return {
    messages,
    conversations,
    currentMessages,
    activeConversation,
    loading,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    loadMessages,
    setActiveConversation,
  };
}
