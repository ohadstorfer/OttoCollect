import React from "react";
import { User } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
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

  const isOwnProfile = user && profile && user.id === profile.id;
  const userRank = (profile?.rank || "Newbie");

  const handleEditClick = () => {
    navigate('/settings');
  };

  return (
    <div>
      <Card className="overflow-hidden shadow-lg">
        <div className="p-6">
          {/* Mobile View */}
          <div className="sm:hidden">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-background bg-background shadow-lg">
                {profile.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={profile.username} />
                ) : (
                  <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-lg">
                    {profile?.username ? getInitials(profile.username) : "U"}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="text-center">
                <h1 className="text-2xl font-serif mb-2">{profile.username}</h1>
                <Badge variant="user" rank={userRank} showIcon />
                {profile.about && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {profile.about}
                  </p>
                )}
              </div>

              {/* Mobile Follow Stats */}
              <div className="w-full">
                <FollowStats 
                  profileId={profile.id}
                  isOwnProfile={!!isOwnProfile}
                  username={profile.username}
                />
              </div>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:flex items-center gap-8 ">
            <Avatar className="h-20 w-20 border-4 border-background bg-background shadow-lg flex-shrink-0">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.username} />
              ) : (
                <AvatarFallback className="bg-ottoman-700 text-parchment-100 text-lg">
                  {profile?.username ? getInitials(profile.username) : "U"}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-serif font-semibold">
                  {profile.username}
                </h1>
                <Badge variant="user" rank={userRank} showIcon />
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

            {/* Desktop Follow Stats */}
            <div className="flex-shrink-0">
              <FollowStats 
                profileId={profile.id}
                isOwnProfile={!!isOwnProfile}
                username={profile.username}
              />
            </div>

            {/* Edit Profile Button */}
            {isOwnProfile && (
              <Button
                onClick={onEditProfileClick}
                variant="outline"
                size="icon"
                className="h-8 w-8 flex-shrink-0 self-start mt-1"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Mobile Edit Button */}
      <div className="sm:hidden flex justify-center mt-2">
        {isOwnProfile && (
          <Button
            onClick={onEditProfileClick}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
