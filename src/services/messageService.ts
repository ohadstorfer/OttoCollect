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

    return data as Message[];
  } catch (error) {
    console.error("Error in getMessages:", error);
    return [];
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string, referenceItemId?: string): Promise<Message | null> {
  try {
    const newMessage = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      reference_item_id: referenceItemId, // Changed from referenceItemId to reference_item_id
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

    return data as Message;
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
