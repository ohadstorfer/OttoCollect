
import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import { 
  fetchConversations, 
  fetchMessages, 
  sendMessage as sendMessageService, 
  subscribeToMessages,
  getUnreadMessagesCount
} from '@/services/messageService';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  otherUserId: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

export function useMessages(currentUserId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const { toast } = useToast();

  // Fetch all conversations for the current user
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    
    setIsLoading(true);
    try {
      const conversations = await fetchConversations(currentUserId);
      setConversations(conversations);
      
      // Calculate total unread messages
      const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load your conversations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, toast]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (otherUserId: string) => {
    if (!currentUserId) return;
    
    setIsLoading(true);
    try {
      const messages = await fetchMessages(currentUserId, otherUserId);
      setCurrentMessages(messages);
      setActiveConversation(otherUserId);
      
      // Update the unread count for this conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.otherUserId === otherUserId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Recalculate total unread count
      const updatedConversations = conversations.map(conv => 
        conv.otherUserId === otherUserId ? { ...conv, unreadCount: 0 } : conv
      );
      const total = updatedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setTotalUnreadCount(total);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, conversations, toast]);

  // Send a new message
  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    referenceItemId?: string
  ) => {
    if (!currentUserId) return null;
    
    try {
      const newMessage = await sendMessageService(
        currentUserId,
        receiverId,
        content,
        referenceItemId
      );
      
      if (newMessage) {
        // Update current message list if this is the active conversation
        if (activeConversation === receiverId) {
          setCurrentMessages(prev => [...prev, newMessage]);
        }
        
        // Update conversations list
        const now = new Date().toISOString();
        setConversations(prev => {
          const existingConv = prev.find(c => c.otherUserId === receiverId);
          
          if (existingConv) {
            // Update existing conversation
            return prev.map(conv => 
              conv.otherUserId === receiverId 
                ? { ...conv, lastMessage: newMessage }
                : conv
            ).sort((a, b) => 
              new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
            );
          } else {
            // Create new conversation if receiver not found
            return [
              {
                otherUserId: receiverId,
                otherUser: { id: receiverId, username: "User", avatar_url: undefined },
                lastMessage: newMessage,
                unreadCount: 0
              },
              ...prev
            ];
          }
        });
        
        return newMessage;
      }
      return null;
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentUserId, activeConversation, toast]);

  // Handle incoming real-time messages
  const handleIncomingMessage = useCallback((message: Message) => {
    // Add to current messages if from active conversation
    if (activeConversation === message.sender_id) {
      setCurrentMessages(prev => [...prev, message]);
      
      // Mark as read immediately since conversation is open
      sendMessageService(
        message.sender_id,
        message.receiver_id,
        message.content,
        message.reference_item_id
      );
    } else {
      // Update unread count for conversation
      setConversations(prev => {
        const existingConv = prev.find(c => c.otherUserId === message.sender_id);
        
        if (existingConv) {
          return prev.map(conv => 
            conv.otherUserId === message.sender_id 
              ? { 
                  ...conv, 
                  lastMessage: message, 
                  unreadCount: conv.unreadCount + 1 
                }
              : conv
          ).sort((a, b) => 
            new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
          );
        } else {
          // Create new conversation
          return [
            {
              otherUserId: message.sender_id,
              otherUser: { id: message.sender_id, username: "User", avatar_url: undefined },
              lastMessage: message,
              unreadCount: 1
            },
            ...prev
          ];
        }
      });
      
      // Update total unread count
      setTotalUnreadCount(prev => prev + 1);
      
      // Show notification
      toast({
        title: "New Message",
        description: `You received a new message: "${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}"`,
      });
    }
  }, [activeConversation, toast]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!currentUserId) return;

    // Set up subscription
    const unsubscribe = subscribeToMessages(currentUserId, handleIncomingMessage);
    
    // Initial load of conversations
    loadConversations();
    
    return () => {
      unsubscribe();
    };
  }, [currentUserId, handleIncomingMessage, loadConversations]);

  return {
    conversations,
    currentMessages,
    activeConversation,
    totalUnreadCount,
    isLoading,
    loadConversations,
    loadMessages,
    sendMessage,
    setActiveConversation
  };
}
