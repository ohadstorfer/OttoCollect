
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  referenceItemId?: string
): Promise<Message | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        reference_item_id: referenceItemId
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return {
      id: data.id,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      content: data.content,
      reference_item_id: data.reference_item_id,
      isRead: data.is_read,
      created_at: data.created_at,
      // Alias properties for compatibility
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      createdAt: data.created_at,
      referenceItemId: data.reference_item_id
    };
  } catch (error) {
    console.error('Unexpected error in sendMessage:', error);
    return null;
  }
}

export async function getMessages(userId: string): Promise<Message[]> {
  try {
    // Get all messages where user is either sender or receiver
    const { data, error } = await supabase
      .from('messages')
      .select()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return data.map(message => ({
      id: message.id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      reference_item_id: message.reference_item_id,
      isRead: message.is_read,
      created_at: message.created_at,
      // Alias properties for compatibility
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      createdAt: message.created_at,
      referenceItemId: message.reference_item_id
    }));
  } catch (error) {
    console.error('Unexpected error in getMessages:', error);
    return [];
  }
}

export async function markAsRead(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
      
    if (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in markAsRead:', error);
    return false;
  }
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error fetching unread messages count:', error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error('Unexpected error in getUnreadMessagesCount:', error);
    return 0;
  }
}

// Function to subscribe to new messages - returns the RealtimeChannel
export function subscribeToMessages(userId: string, onNewMessage: (message: Message) => void) {
  return supabase
    .channel('messages')
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${userId}`
      },
      (payload) => {
        const message = payload.new as any;
        onNewMessage({
          id: message.id,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          reference_item_id: message.reference_item_id,
          isRead: message.is_read,
          created_at: message.created_at,
          // Alias properties for compatibility
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          createdAt: message.created_at,
          referenceItemId: message.reference_item_id
        });
      }
    )
    .subscribe();
}

export async function getConversations(userId: string) {
  // A more complex query to get distinct conversations
  // This is a placeholder implementation
  try {
    const { data: sent, error: sentError } = await supabase
      .from('messages')
      .select('receiver_id')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });
      
    const { data: received, error: receivedError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });
      
    if (sentError || receivedError) {
      console.error('Error fetching conversations:', sentError || receivedError);
      return [];
    }
    
    // Combine unique user IDs
    const userIds = new Set([
      ...sent.map(msg => msg.receiver_id),
      ...received.map(msg => msg.sender_id)
    ]);
    
    return Array.from(userIds);
  } catch (error) {
    console.error('Unexpected error in getConversations:', error);
    return [];
  }
}
