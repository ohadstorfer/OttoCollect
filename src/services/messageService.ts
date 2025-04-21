import { Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Example function to fetch messages between two users
export const fetchMessagesForUsers = async (currentUserId: string, otherUserId: string) => {
  // Implementation here
};

// Function to send a message with corrected property names
export const sendMessage = async (message: Omit<Message, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('messages').insert({
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    content: message.content,
    is_read: message.isRead,
    reference_item_id: message.reference_item_id, // Correct property name
    created_at: new Date().toISOString()
  }).select();
  
  if (error) {
    console.error("Error sending message:", error);
    throw error;
  }
  
  return data?.[0] as Message;
};
