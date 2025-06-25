
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
import { Card } from "@/components/ui/card";
import { FollowStats } from "./FollowStats";

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
  const userRank = (profile?.rank || "Newbie");

  const handleMessageClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowMessageDialog(true);
  };

  const handleEditClick = () => {
    navigate('/settings');
  };

  return (
    <div>
      <Card className="overflow-hidden shadow-lg">
        <div className="p-2">
          {/* Mobile View */}
          <div className="sm:hidden bg-card/50">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-4 border-background bg-background shadow-lg flex-shrink-0">
                {profile.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={profile.username} />
                ) : (
                  <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-lg">
                    {profile?.username ? getInitials(profile.username) : "U"}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex-1 space-y-1.5">
                <h1 className="text-2xl font-serif">{profile.username}</h1>
                <Badge variant="user" rank={userRank} showIcon />
                {profile.about && (
                  <p className="text-sm text-muted-foreground">
                    {profile.about}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Follow Stats */}
            <div className="mt-4 pt-4 border-t">
              <FollowStats 
                profileId={profile.id}
                isOwnProfile={!!isOwnProfile}
              />
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:flex flex-row items-center gap-6 p-2">
            <Avatar className="h-20 w-20 border-4 border-background bg-background shadow-lg">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.username} />
              ) : (
                <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-lg">
                  {profile?.username ? getInitials(profile.username) : "U"}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-row items-center gap-3 mb-2">
                <h1 className="text-2xl font-serif font-semibold">
                  {profile.username}
                </h1>
                <Badge variant="user" rank={userRank} showIcon />
              </div>

              {/* Desktop Follow Stats */}
              <div className="mb-4">
                <FollowStats 
                  profileId={profile.id}
                  isOwnProfile={!!isOwnProfile}
                />
              </div>

              <div className="text-sm text-muted-foreground max-w-2xl">
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
              </div>
            </div>

            {isOwnProfile ? (
              <Button
                onClick={onEditProfileClick}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <Edit className="h-3 w-3" />
              </Button>
            ) : (
              user && (
                <Button
                  onClick={handleMessageClick}
                  className="flex items-center gap-2"
                   variant="outline"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
              )
            )}
          </div>
        </div>
      </Card>

      <div className="sm:hidden flex justify-center mt-2">
      {isOwnProfile ? (
              <Button
                onClick={onEditProfileClick}
                variant="outline"
                size="icon"
                className="h-8 w-8"
              >
                <Edit className="h-3 w-3" />
              </Button>
            ) : (
              user && (
                <Button
                  onClick={handleMessageClick}
                  className="flex items-center gap-2"
                  variant="outline"
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
