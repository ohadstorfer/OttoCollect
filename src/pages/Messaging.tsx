
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { MessageCenter } from "@/components/messages/MessageCenter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { checkUserDailyMessagingLimit } from "@/services/messageService";

export default function Messaging() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [hasReachedDailyLimit, setHasReachedDailyLimit] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  // Check if user is in limited ranks
  const isLimitedRank = user ? ['Newbie Collector', 'Beginner Collector', 'Mid Collector'].includes(user.rank || '') : false;

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

  if (!user) {
    return (
      <div className="page-container">
        <h1 className="page-title">Messages</h1>
        
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Sign In to Access Messages</h2>
            <p className="mb-6 text-muted-foreground">
              Please sign in to access your messages and chat with other collectors.
            </p>
            <Button onClick={() => navigate('/auth')}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Messages</h1>
      
      <div className="flex flex-col mb-10">
        <p className="text-muted-foreground mb-4 text-center">
          Chat with other collectors, discuss banknotes, and arrange trades or purchases.
        </p>
        
        <MessageCenter 
          hasReachedDailyLimit={hasReachedDailyLimit}
          isLimitedRank={isLimitedRank}
          initialUserId={userId}
        />
      </div>
    </div>
  );
}
