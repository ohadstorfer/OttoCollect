
import { Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Example function to fetch messages between two users
export const fetchMessagesForUsers = async (currentUserId: string, otherUserId: string) => {
  // Implementation here
};

// Function to send a message with parameters that match what's being used in the app
export const sendMessage = async (
  senderUserId: string, 
  receiverUserId: string, 
  content: string,
  referenceItemId?: string
) => {
  const messageData = {
    sender_id: senderUserId,
    receiver_id: receiverUserId,
    content: content,
    is_read: false,
    reference_item_id: referenceItemId,
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('messages')
    .insert(messageData)
    .select();
  
  if (error) {
    console.error("Error sending message:", error);
    throw error;
  }
  
  return data?.[0] as Message;
};

// Get unread messages count for a user
export const getUnreadMessagesCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error("Error fetching unread message count:", error);
      return 0;
    }
    
    return count || 0;
  } catch (err) {
    console.error("Unexpected error getting unread messages count:", err);
    return 0;
  }
};

// Subscribe to new messages for a user
export const subscribeToMessages = (userId: string, onNewMessage: () => void) => {
  // Subscribe to messages where the user is the receiver
  const subscription = supabase
    .channel(`messages-${userId}`)
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `receiver_id=eq.${userId}` 
    }, () => {
      // Call the callback when a new message is received
      onNewMessage();
    })
    .subscribe();

  // Return a function to unsubscribe
  return () => {
    supabase.removeChannel(subscription);
  };
};

// Mark a message as read
export const markMessageAsRead = async (messageId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    if (error) {
      console.error("Error marking message as read:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error marking message as read:", err);
    return false;
  }
};

// Mark all messages from a specific sender as read
export const markAllMessagesAsRead = async (receiverId: string, senderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', receiverId)
      .eq('sender_id', senderId)
      .eq('is_read', false);
    
    if (error) {
      console.error("Error marking messages as read:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error marking messages as read:", err);
    return false;
  }
};
