
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message, Conversation } from '@/types';

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

const useMessages = (currentUserId?: string): UseMessagesReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all messages for the current user
  const fetchAllMessages = useCallback(async () => {
    if (!currentUserId) return [];
    
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
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
        
        // Add alias properties for compatibility
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
  }, [currentUserId]);

  // Group messages by conversation
  const buildConversations = useCallback(async (messagesData: Message[]) => {
    if (!currentUserId || messagesData.length === 0) {
      setConversations([]);
      return;
    }
    
    try {
      // Get unique conversation partners
      const conversationUsers = new Set<string>();
      messagesData.forEach(message => {
        if (message.sender_id === currentUserId) {
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
  }, [currentUserId]);

  // Load messages for a specific user conversation
  const loadMessages = useCallback(async (userId: string) => {
    if (!currentUserId) return;
    
    setLoading(true);
    setActiveConversation(userId);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),` +
          `and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
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
        
        // Add alias properties
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
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMsgIds);
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Send a message
  const sendMessage = async (message: Omit<Message, 'id' | 'createdAt'>) => {
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

      // Update messages state with properly formatted message
      const newMessage: Message = {
        id: data[0].id,
        sender_id: data[0].sender_id,
        receiver_id: data[0].receiver_id, 
        content: data[0].content,
        created_at: data[0].created_at,
        isRead: data[0].is_read,
        reference_item_id: data[0].reference_item_id,
        
        // Add alias properties
        senderId: data[0].sender_id,
        receiverId: data[0].receiver_id,
        createdAt: data[0].created_at
      };
      
      // Update current messages if we're in the relevant conversation
      if (activeConversation === message.receiver_id) {
        setCurrentMessages(prevMessages => [...prevMessages, newMessage]);
      }
      
      return true;
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      return false;
    }
  };

  // Mark a message as read
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

      // Update local state
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      
      return true;
    } catch (err) {
      console.error('Unexpected error marking message as read:', err);
      return false;
    }
  };

  // Initial load of messages
  useEffect(() => {
    if (currentUserId) {
      const loadAllMessages = async () => {
        const messagesData = await fetchAllMessages();
        await buildConversations(messagesData);
      };
      
      loadAllMessages();
    }
  }, [currentUserId, fetchAllMessages, buildConversations]);

  // Set up subscription for new messages
  useEffect(() => {
    if (!currentUserId) return;
    
    const messageSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const messagesData = await fetchAllMessages();
        await buildConversations(messagesData);
        
        // Update current conversation if active
        if (activeConversation) {
          loadMessages(activeConversation);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [currentUserId, fetchAllMessages, buildConversations, activeConversation, loadMessages]);

  return {
    messages,
    conversations,
    currentMessages,
    activeConversation,
    loading,
    isLoading: loading, // Alias for compatibility
    error,
    sendMessage,
    markAsRead,
    loadMessages,
    setActiveConversation
  };
};

export default useMessages;
