
import React from "react";
import { User } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { MessageCircle, MapPin, Calendar, Edit } from "lucide-react";
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
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {profile.country && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.country}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="md:self-center flex-shrink-0 space-x-2">
          {!isOwnProfile && user && (
            <Button 
              onClick={handleMessageClick}
              size="sm"
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          )}
          
          {isOwnProfile && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate('/collection')}
            >
              <Edit className="h-4 w-4" />
              Manage Collection
            </Button>
          )}
        </div>
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
