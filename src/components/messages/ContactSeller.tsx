
import React, { useRef, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { AuthRequiredDialog } from '@/components/auth/AuthRequiredDialog';

interface ContactSellerProps {
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  /** Pre-typed opening line (item + reference); the cursor starts on the line below it. */
  initialMessage?: string;
  /** Styling overrides for the trigger button (marketplace cards use the View Source look). */
  buttonClassName?: string;
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
  buttonSize?: React.ComponentProps<typeof Button>['size'];
  hideIcon?: boolean;
}

export function ContactSeller({
  sellerId,
  sellerName,
  itemId,
  itemName,
  initialMessage = '',
  buttonClassName,
  buttonVariant = 'outline',
  buttonSize = 'sm',
  hideIcon = false,
}: ContactSellerProps) {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpenChange = (open: boolean) => {
    // Only seed an empty draft, so a half-written message survives close/reopen.
    if (open && !message) setMessage(initialMessage);
    setIsOpen(open);
  };
  const [isSending, setIsSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation(['messaging']);
  
  const handleSendMessage = async () => {
    if (!message.trim() || !user?.id) return;
    
    setIsSending(true);
    try {
      const result = await sendMessage(user.id, sellerId, message, itemId);
      
      if (result) {
        toast({
          title: t('contactSeller.messageSent.title'),
          description: t('contactSeller.messageSent.description', { sellerName }),
        });
        setMessage('');
        setIsOpen(false);
      } else {
        toast({
          title: t('contactSeller.error.title'),
          description: t('contactSeller.error.description'),
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };
  
  const triggerButton = (onClick?: () => void) => (
    <Button
      size={buttonSize}
      variant={buttonVariant}
      className={buttonClassName ?? 'mt-2'}
      onClick={onClick}
    >
      {!hideIcon && <MessageSquare className="h-4 w-4 mr-2" />}
      {t('contactSeller.contactButton')}
    </Button>
  );

  // Spec §8b: guests see the button too — clicking prompts them to register/log in.
  if (!user) {
    return (
      <>
        {triggerButton(() => setIsOpen(true))}
        <AuthRequiredDialog open={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  // Don't show contact button if viewing your own listing
  if (user.id === sellerId) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{triggerButton()}</DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(e) => {
          // Put the caret after the pre-typed line instead of at the start.
          e.preventDefault();
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('contactSeller.dialogTitle', { sellerName })}</DialogTitle>
          <DialogDescription>
            {t('contactSeller.dialogDescription', { itemName })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            ref={textareaRef}
            placeholder={t('contactSeller.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('contactSeller.cancel')}
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
          >
            {t('contactSeller.sendMessage')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
