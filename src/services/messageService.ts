
import { supabase } from "@/integrations/supabase/client";
import { Message, Conversation } from "@/types/message";

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

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  try {
    // First fetch all messages involving this user
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        is_read,
        created_at,
        reference_item_id
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
    
    // Now separately fetch user profiles for all other participants
    // We can't rely on foreign key relationships in the query
    // so we'll extract participant IDs and fetch their profiles
    const participantIds = new Set<string>();
    
    messages.forEach(message => {
      if (message.sender_id !== userId) {
        participantIds.add(message.sender_id);
      }
      if (message.receiver_id !== userId) {
        participantIds.add(message.receiver_id);
      }
    });
    
    // Fetch profiles for all participants
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .in('id', Array.from(participantIds));
      
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      return [];
    }
    
    const profilesMap = new Map();
    profiles?.forEach(profile => {
      profilesMap.set(profile.id, {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatar_url,
        rank: profile.rank,
      });
    });
    
    // Group messages by conversation (other user)
    const conversationsMap = new Map<string, Conversation>();
    
    messages.forEach(message => {
      const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
      const mappedMessage = mapDbMessageToMessage(message);
      
      if (!conversationsMap.has(otherUserId)) {
        // Get the profile data from our map
        const otherUser = profilesMap.get(otherUserId) || {
          id: otherUserId,
          username: "Unknown User",
          avatarUrl: undefined,
          rank: "Newbie"
        };
        
        conversationsMap.set(otherUserId, {
          otherUserId,
          otherUser,
          lastMessage: mappedMessage,
          unreadCount: message.receiver_id === userId && !message.is_read ? 1 : 0
        });
      } else {
        const existing = conversationsMap.get(otherUserId)!;
        if (new Date(message.created_at) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = mappedMessage;
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
    
    // Mark unread messages as read
    try {
      await supabase.rpc('mark_messages_as_read', {
        from_user_id: otherUserId,
        to_user_id: userId
      });
    } catch (markError) {
      console.error("Error marking messages as read:", markError);
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
