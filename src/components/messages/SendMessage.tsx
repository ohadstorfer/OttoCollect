
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
} from "@/components/ui/dialog";
import { sendMessage } from '@/services/messageService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SendMessageProps {
  receiverId: string;
  receiverName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendMessage({ receiverId, receiverName, isOpen, onOpenChange }: SendMessageProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation(['messaging']);
  
  const handleSendMessage = async () => {
    if (!message.trim() || !user?.id) return;
    
    setIsSending(true);
    try {
      const result = await sendMessage(user.id, receiverId, message);
      
      if (result) {
        toast({
          title: t('sendMessage.messageSent.title'),
          description: t('sendMessage.messageSent.description', { receiverName }),
        });
        setMessage('');
        onOpenChange(false);
        
        // Optional: redirect to the community/messages page
        navigate('/community');
      } else {
        toast({
          title: t('sendMessage.error.title'),
          description: t('sendMessage.error.description'),
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sendMessage.dialogTitle', { receiverName })}</DialogTitle>
          <DialogDescription>
            {t('sendMessage.dialogDescription', { receiverName })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            placeholder={t('sendMessage.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('sendMessage.cancel')}
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
          >
            {t('sendMessage.sendMessage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
