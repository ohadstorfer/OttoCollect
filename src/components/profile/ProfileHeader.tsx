
import React from "react";
import { User, UserRank } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

interface ProfileHeaderProps {
  profile: User;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
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
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {profile.country && (
              <span>{profile.country}</span>
            )}
            <span>
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
