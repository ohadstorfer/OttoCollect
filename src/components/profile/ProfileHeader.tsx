
import React from "react";
import { User } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { SendMessage } from "@/components/messages/SendMessage";
import { useNavigate } from "react-router-dom";

interface ProfileHeaderProps {
  profile: User;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMessageDialog, setShowMessageDialog] = React.useState(false);
  
  const isOwnProfile = user && profile && user.id === profile.id;
  
  const handleMessageClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowMessageDialog(true);
  };

  return (
    <div className="relative">
      {/* Banner background */}
      <div className="h-40 bg-gradient-to-r from-ottoman-800 to-ottoman-600" />
      
      {/* Profile info overlay */}
      <div className="px-6 pb-5 pt-0 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-5 -mt-16">
        <Avatar className="h-32 w-32 border-4 border-background bg-background shadow-lg">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username} />
          ) : (
            <AvatarFallback className="text-3xl bg-ottoman-700 text-ottoman-100">
              {getInitials(profile.username)}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1 flex flex-col items-center md:items-start space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              {profile.username}
            </h1>
            <Badge variant="user" rank={profile.rank} showIcon />
          </div>
          
          <div className="text-sm text-muted-foreground max-w-xl">
            {profile.about ? (
              <p>{profile.about}</p>
            ) : (
              <p className="italic">
                {isOwnProfile 
                  ? "You haven't added any information about yourself yet."
                  : "This user hasn't added any information about themselves yet."
                }
              </p>
            )}
            {profile.country && (
              <p className="mt-1">{profile.country}</p>
            )}
          </div>
        </div>

        {!isOwnProfile && user && (
          <div className="md:self-center flex-shrink-0">
            <Button 
              onClick={handleMessageClick}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          </div>
        )}
      </div>
      
      {!isOwnProfile && user && (
        <SendMessage
          receiverId={profile.id}
          receiverName={profile.username}
          isOpen={showMessageDialog}
          onOpenChange={setShowMessageDialog}
        />
      )}
    </div>
  );
}
