
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';

// Fix the property name issue and export the function
export async function sendMessage(senderId: string, receiverId: string, content: string, referenceItemId?: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content,
        reference_item_id: referenceItemId
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in sendMessage:', err);
    return null;
  }
}

// Add missing functions needed by MessageIndicator and MessageButton
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
  } catch (err) {
    console.error('Unexpected error in getUnreadMessagesCount:', err);
    return 0;
  }
}

export function subscribeToMessages(userId: string, callback: () => void) {
  const subscription = supabase
    .channel('messages-channel')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `receiver_id=eq.${userId}` 
    }, () => {
      callback();
    })
    .subscribe();
    
  return () => {
    subscription.unsubscribe();
  };
}
