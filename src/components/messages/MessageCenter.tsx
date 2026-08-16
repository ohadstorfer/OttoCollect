import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useMessages from '@/hooks/use-messages';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from './MessageList';
import MessagePanel from './MessagePanel';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserRank } from '@/types';
import { checkUserDailyMessagingLimit } from '@/services/messageService';
import { Message } from '@/types';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

interface MessageCenterProps {
  hasReachedDailyLimit?: boolean;
  isLimitedRank?: boolean;
  initialUserId?: string;
}

export function MessageCenter({ 
  hasReachedDailyLimit: initialHasReachedDailyLimit = false, 
  isLimitedRank = false,
  initialUserId 
}: MessageCenterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showMessages, setShowMessages] = useState(!isMobile);
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(initialHasReachedDailyLimit);
  const [dailyCount, setDailyCount] = useState(0);
  const { t } = useTranslation(['messaging', 'marketplace']);
  const { direction } = useLanguage();
  const { toast } = useToast();
  // Chat→email digest consent (spec §7.1) — profile-level, revocable any time.
  const [chatConsent, setChatConsent] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('chat_email_consent')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setChatConsent(Boolean((data as any)?.chat_email_consent));
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleConsentChange = async (next: boolean) => {
    if (!user?.id) return;
    setChatConsent(next); // optimistic
    const { error } = await supabase
      .from('profiles')
      .update({
        chat_email_consent: next,
        chat_email_consent_at: next ? new Date().toISOString() : null,
      } as any)
      .eq('id', user.id);
    if (error) {
      console.error('Error saving chat email consent:', error);
      setChatConsent(!next);
      toast({ title: t('listing.saveError', { ns: 'marketplace' }), variant: 'destructive' });
    }
  };
  const { 
    conversations, 
    currentMessages, 
    activeConversation, 
    isLoading, 
    loadMessages, 
    sendMessage,
    setActiveConversation,
    createTemporaryConversation
  } = useMessages();

  // Check daily limit when component mounts or user changes
  useEffect(() => {
    const checkDailyLimit = async () => {
      if (!user || !isLimitedRank) return;
      
      try {
        const { hasReachedLimit, dailyCount: count } = await checkUserDailyMessagingLimit(user.id);
        setHasReachedDailyLimit(hasReachedLimit);
        setDailyCount(count);
      } catch (error) {
        console.error('Error checking daily messaging limit:', error);
      }
    };

    checkDailyLimit();
  }, [user, isLimitedRank]);

  // Handle initial user ID from URL parameter
  useEffect(() => {
    const setupInitialConversation = async () => {
      if (!initialUserId || !user?.id) return;

      // Check if we already have a conversation with this user
      const existingConversation = conversations.find(c => 
        c.otherUserId === initialUserId || 
        (c.lastMessage && (
          c.lastMessage.senderId === initialUserId || 
          c.lastMessage.recipientId === initialUserId
        ))
      );

      if (existingConversation) {
        // Existing conversation found
        loadMessages(initialUserId);
        setActiveConversation(initialUserId);
        if (isMobile) {
          setShowMessages(true);
        }
      } else {
        // No existing conversation - create a temporary one
        const tempConv = await createTemporaryConversation(initialUserId);
        if (tempConv) {
          setActiveConversation(initialUserId);
          // Start with empty messages for new conversation
          if (isMobile) {
            setShowMessages(true);
          }
        }
      }
    };

    setupInitialConversation();
  }, [initialUserId, conversations, user?.id, loadMessages, setActiveConversation, isMobile, createTemporaryConversation]);

  // Sync showMessages with isMobile and activeConversation
  // On mobile: show messages only if a conversation is selected, otherwise show the conversations list
  useEffect(() => {
    if (isMobile) {
      setShowMessages(Boolean(activeConversation));
    }
  }, [isMobile, activeConversation]);

  // Handle conversation selection
  const handleSelectConversation = (userId: string) => {
    loadMessages(userId);
    // Update URL without causing a page reload
    navigate(`/messaging/${userId}`, { replace: true });
  };

  // Handle back button for mobile
  const handleBackToList = () => {
    setActiveConversation(null);
    setShowMessages(false); // Explicitly show the conversation list again
    // Navigate back to messaging root
    navigate('/messaging', { replace: true });
  };

  // Enhanced send message handler that rechecks limits
  const handleSendMessage = async (message: any) => {
    try {
      const success = await sendMessage(message);
      
      if (success && user && isLimitedRank) {
        // Recheck daily limit after sending message
        const { hasReachedLimit, dailyCount: count } = await checkUserDailyMessagingLimit(user.id);
        setHasReachedDailyLimit(hasReachedLimit);
        setDailyCount(count);
      }
      
      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  // Find active conversation recipient data
  const activeRecipientData = activeConversation 
    ? conversations.find(c => c.otherUserId === activeConversation)?.otherUser 
    : undefined;
    
  // Convert string rank to UserRank
  const typedRecipientData = activeRecipientData ? {
    ...activeRecipientData,
    rank: activeRecipientData.rank as UserRank
  } : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] w-full rounded-lg border shadow-sm overflow-hidden bg-card">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h2 className="text-2xl font-serif font-medium text-parchment-500 flex items-center">
          <MessageCircle className="mr-2" size={24} />
          <span>{t('center.title')}</span>
        </h2>
      </div>

      {user && chatConsent !== null && (
        <div className="flex items-start gap-2 px-4 py-2 border-b bg-muted/10">
          <Checkbox
            id="chat-email-consent"
            checked={chatConsent}
            onCheckedChange={(v) => handleConsentChange(v === true)}
          />
          <div>
            <label htmlFor="chat-email-consent" className="text-sm cursor-pointer">
              {t('listing.chatConsent', { ns: 'marketplace' })}
            </label>
            <p className="text-xs text-muted-foreground">
              {t('listing.chatConsentHint', { ns: 'marketplace' })}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List - Hidden on mobile when showing messages */}
        {(!isMobile || !showMessages) && (
          <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r'} overflow-y-auto`}>
            <MessageList 
              conversations={conversations} 
              activeConversationId={activeConversation}
              isLoading={isLoading} 
              onSelectConversation={handleSelectConversation}
            />
          </div>
        )}
        
        {/* Message Panel - Full width on mobile */}
        {(!isMobile || showMessages) && (
          <div className={`${isMobile ? 'w-full' : 'w-2/3'} flex flex-col h-full overflow-hidden`}>
            {isMobile && activeConversation && (
              <div className="flex items-center p-2 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                >
                  <ChevronLeft size={20} />
                </Button>
                <span className="ml-2 font-medium">
                  {activeRecipientData?.username || t('center.conversation')}
                </span>
              </div>
            )}
            
            <MessagePanel
              messages={currentMessages}
              currentUserId={user?.id}
              recipientId={activeConversation}
              recipientData={typedRecipientData}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              hasReachedDailyLimit={hasReachedDailyLimit}
              isLimitedRank={isLimitedRank}
            />
          </div>
        )}
      </div>
    </div>
  );
}
