
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendMessage } from '@/services/messageService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

interface ContactSellerProps {
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
}

export function ContactSeller({ sellerId, sellerName, itemId, itemName }: ContactSellerProps) {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleSendMessage = async () => {
    if (!message.trim() || !user?.id) return;
    
    setIsSending(true);
    try {
      const result = await sendMessage(user.id, sellerId, message, itemId);
      
      if (result) {
        toast({
          title: "Message Sent",
          description: `Your message has been sent to ${sellerName}.`,
        });
        setMessage('');
        setIsOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to send your message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };
  
  if (!user) {
    return (
      <div> </div>
    );
  }
  
  // Don't show contact button if viewing your own listing
  if (user.id === sellerId) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="mt-2" variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Seller
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact {sellerName}</DialogTitle>
          <DialogDescription>
            Send a message about "{itemName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder="Write your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
          >
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
