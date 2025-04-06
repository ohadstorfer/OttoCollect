
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types";
import { useToast } from "@/hooks/use-toast";

// Helper function to convert database message to our Message type
const mapDbMessageToMessage = (dbMessage: any): Message => {
  return {
    id: dbMessage.id,
    senderId: dbMessage.sender_id,
    receiverId: dbMessage.receiver_id,
    content: dbMessage.content,
    referenceItemId: dbMessage.reference_item_id,
    isRead: dbMessage.is_read,
    createdAt: dbMessage.created_at,
  };
};

export async function fetchConversations(userId: string): Promise<any[]> {
  try {
    // Get unique conversations (distinct sender/receiver pairs)
    const { data: sentMessages, error: sentError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at,
        profiles:receiver_id (id, username, avatar_url),
        reference_item_id
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    const { data: receivedMessages, error: receivedError } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at,
        profiles:sender_id (id, username, avatar_url),
        reference_item_id
      `)
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });

    if (sentError || receivedError) {
      console.error("Error fetching conversations:", sentError || receivedError);
      return [];
    }

    // Combine and deduplicate conversations
    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];
    
    // Group messages by conversation
    const conversationsMap = new Map();
    
    allMessages.forEach(message => {
      const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
      const otherUser = message.sender_id === userId 
        ? message.profiles 
        : message.profiles;
      
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          otherUserId,
          otherUser,
          lastMessage: mapDbMessageToMessage(message),
          unreadCount: message.receiver_id === userId && !message.is_read ? 1 : 0
        });
      } else {
        const existing = conversationsMap.get(otherUserId);
        if (new Date(message.created_at) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = mapDbMessageToMessage(message);
        }
        if (message.receiver_id === userId && !message.is_read) {
          existing.unreadCount += 1;
        }
      }
    });
    
    return Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  } catch (error) {
    console.error("Error in fetchConversations:", error);
    return [];
  }
}

export async function fetchMessages(userId: string, otherUserId: string): Promise<Message[]> {
  try {
    // Get messages between the two users
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
    
    // Mark received messages as read
    const unreadMessageIds = data
      ?.filter(msg => msg.receiver_id === userId && !msg.is_read)
      .map(msg => msg.id);
      
    if (unreadMessageIds && unreadMessageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadMessageIds);
    }
    
    // Convert database messages to our Message type
    return data?.map(mapDbMessageToMessage) || [];
  } catch (error) {
    console.error("Error in fetchMessages:", error);
    return [];
  }
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  referenceItemId?: string
): Promise<Message | null> {
  try {
    const newMessage = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      reference_item_id: referenceItemId,
      is_read: false
    };
    
    const { data, error } = await supabase
      .from('messages')
      .insert(newMessage)
      .select()
      .single();
      
    if (error) {
      console.error("Error sending message:", error);
      return null;
    }
    
    return mapDbMessageToMessage(data);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return null;
  }
}

export function subscribeToMessages(
  userId: string,
  callback: (message: Message) => void
): () => void {
  const channel = supabase
    .channel('messages-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`
      },
      (payload) => {
        const newMessage = mapDbMessageToMessage(payload.new);
        callback(newMessage);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getUnreadMessagesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
      
    if (error) {
      console.error("Error counting unread messages:", error);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error);
    return 0;
  }
}
