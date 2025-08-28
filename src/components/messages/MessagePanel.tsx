import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from 'lucide-react';

interface MessagePanelProps {
  conversationUserId: string;
  referenceItemId?: string;
}

const MessagePanel = ({ conversationUserId, referenceItemId }: MessagePanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useUser();
  const currentUser = user;
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data, error: fetchError } = supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUser?.id},sender_id.eq.${conversationUserId}`)
    .or(`receiver_id.eq.${currentUser?.id},receiver_id.eq.${conversationUserId}`)
    .order('created_at', { ascending: true })
    .returns<Message[]>()
    .useSubscription()

  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
      toast({
        title: "Error",
        description: "Failed to fetch messages.",
        variant: "destructive",
      })
    }
  }, [fetchError, toast]);

  useEffect(() => {
    if (data) {
      const formattedMessages = data.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        content_ar: msg.content_ar,
        content_tr: msg.content_tr,
        created_at: msg.created_at,
        isRead: msg.is_read,
        reference_item_id: msg.reference_item_id || '',
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        createdAt: msg.created_at,
        recipientId: msg.receiver_id
      }));
      setMessages(formattedMessages);
    }
  }, [data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: "Warning",
        description: "Message cannot be empty.",
      })
      return;
    }

    if (!currentUser?.id) {
      toast({
        title: "Warning",
        description: "You must be logged in to send a message.",
      })
      return;
    }

    const messageData = {
      sender_id: currentUser?.id || '',
      receiver_id: conversationUserId,
      content: newMessage.trim(),
      isRead: false,
      reference_item_id: referenceItemId || '',
      created_at: new Date().toISOString(),
      senderId: currentUser?.id || '',
      receiverId: conversationUserId,
      recipientId: conversationUserId
    };

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: messageData.sender_id,
            receiver_id: messageData.receiver_id,
            content: messageData.content,
            isRead: messageData.isRead,
            reference_item_id: messageData.reference_item_id,
          },
        ]);

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message.",
          variant: "destructive",
        })
        return;
      }

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      })
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex w-full flex-col ${msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'
                }`}
            >
              <div className="flex items-center space-x-2">
                {msg.sender_id !== currentUser?.id && (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={`https://avatar.vercel.sh/${msg.senderId}.png`} alt={msg.senderId} />
                    <AvatarFallback>{msg.senderId.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${msg.sender_id === currentUser?.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                    }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessagePanel;
