
// Fix for the property name mismatch in Message type
import { Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export async function getMessages(userId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    // Transform data to match the Message interface
    return (data || []).map(msg => ({
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
  } catch (error) {
    console.error("Error in getMessages:", error);
    return [];
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string, reference_item_id?: string): Promise<Message | null> {
  try {
    const newMessage = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      reference_item_id, // Using the correct property name
      is_read: false
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([newMessage])
      .select('*')
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    // Transform to match our Message interface
    return data ? {
      id: data.id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      content: data.content,
      created_at: data.created_at,
      isRead: data.is_read,
      reference_item_id: data.reference_item_id,
      
      // Add alias properties for compatibility
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      createdAt: data.created_at
    } : null;
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return null;
  }
}

export async function markMessageAsRead(messageId: string): Promise<boolean> {
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
  } catch (error) {
    console.error("Error in markMessageAsRead:", error);
    return false;
  }
}

// Add the missing functions needed by MessageIndicator and MessageButton
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('is_read', false);
      
    if (error) {
      console.error("Error fetching unread messages count:", error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    return 0;
  }
}

export function subscribeToMessages(userId: string, onNewMessage: () => void): () => void {
  const subscription = supabase
    .channel(`user-messages-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT', 
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`
    }, onNewMessage)
    .subscribe();
    
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(subscription);
  };
}
