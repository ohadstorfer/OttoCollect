import React from "react";
import { User, UserRank } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { MessageCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { SendMessage } from "@/components/messages/SendMessage";
import { useNavigate } from "react-router-dom";

interface ProfileHeaderProps {
  profile: User;
  isEditingProfile?: boolean;
  onEditProfileClick?: () => void;
}

export function ProfileHeader({ profile, isEditingProfile, onEditProfileClick }: ProfileHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMessageDialog, setShowMessageDialog] = React.useState(false);

  const isOwnProfile = user && profile && user.id === profile.id;
  const userRank = (profile?.rank || "Newbie") as UserRank;

  const handleMessageClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowMessageDialog(true);
  };

  const handleEditClick = () => {
    // Navigate to settings page for profile editing
    navigate('/settings');
  };

  return (
    <div className="relative">
      {/* Banner background */}
      <div className="h-40 bg-gradient-to-r from-ottoman-800 to-ottoman-600" />

      {/* Profile info overlay */}
      <div className="px-6  pt-0 flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-5 -mt-16">
        <Avatar className="h-32 w-32 border-4 border-background bg-background shadow-lg">
          {profile.avatarUrl ? (
            <AvatarImage src={profile.avatarUrl} alt={profile.username} />
          ) : (
            <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-xs">
              {profile?.username ? getInitials(profile.username) : "U"}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 flex flex-col items-center md:items-start space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              {profile.username}
            </h1>
            <Badge variant="user" rank={userRank} showIcon />
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
        
        {/* Show Edit or Message button as appropriate */}
        {isOwnProfile ? (
          <Button
            onClick={onEditProfileClick}
            className="flex items-center "
            variant="outline"
          >
            <Edit className="h-4 w-4" />

          </Button>
        ) : (
          user && (
            <Button
              onClick={handleMessageClick}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </Button>
          )
        )}
      </div>

      {!isOwnProfile && user && profile?.id && (
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
