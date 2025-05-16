import React, { useEffect, useState } from 'react';
import useMessages from '@/hooks/use-messages';
import { useAuth } from '@/context/AuthContext';
import { MessageList } from './MessageList';
import MessagePanel from './MessagePanel';
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserRank } from '@/types';

export function MessageCenter() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  // Default: on desktop, show message panel if there's a selected convo; on mobile, show convo list on initial load
  const [showMessages, setShowMessages] = useState(!isMobile);

  const { 
    conversations, 
    currentMessages, 
    activeConversation, 
    isLoading, 
    loadMessages, 
    sendMessage,
    setActiveConversation
  } = useMessages(user?.id);

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
  };

  // Handle back button for mobile
  const handleBackToList = () => {
    setActiveConversation(null);
    setShowMessages(false); // Explicitly show the conversation list again
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
          Messages
        </h2>
      </div>
      
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
                  {activeRecipientData?.username || 'Conversation'}
                </span>
              </div>
            )}
            
            <MessagePanel
              messages={currentMessages}
              currentUserId={user?.id}
              recipientId={activeConversation}
              recipientData={typedRecipientData}
              isLoading={isLoading}
              onSendMessage={sendMessage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
