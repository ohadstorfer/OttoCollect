
import React from "react";
import { User } from "@/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { Facebook, Instagram, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { FollowStats } from "./FollowStats";
import { useTheme } from "@/context/ThemeContext";

interface ProfileHeaderProps {
  profile: User;
  isEditingProfile?: boolean;
  onEditProfileClick?: () => void;
}

export function ProfileHeader({ profile, isEditingProfile, onEditProfileClick }: ProfileHeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isOwnProfile = user && profile && user.id === profile.id;
  const userRank = (profile?.rank || "Newbie");

  const handleEditClick = () => {
    navigate('/settings');
  };

  return (
    <div>
      <Card className={`overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-dark-800' : 'bg-white'}`}>
        <div className="p-6">
          {/* Mobile View */}
          <div className="sm:hidden">
            <div className="flex flex-col items-center gap-4">
              <Avatar className={`h-20 w-20 border-4 ${theme === 'dark' ? 'border-dark-700 bg-dark-700' : 'border-background bg-background'} shadow-lg`}>
                {profile?.avatarUrl && !['/placeholder.svg', '/placeholder-brown.svg'].includes(profile.avatarUrl) ? (
                  <AvatarImage 
                    src={profile.avatarUrl} 
                    alt={profile.username}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                    }}
                  />
                ) : (
                  <AvatarFallback 
                    className="bg-gradient-to-br from-ottoman-600 to-ottoman-800 text-parchment-100 text-xl font-semibold uppercase"
                    delayMs={0}
                  >
                    {profile?.username?.charAt(0) || "?"}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="text-center">
                <h1 className={`text-2xl font-serif mb-2 ${theme === 'dark' ? '!text-white' : ''}`}><span>{profile.username}</span></h1>
                <Badge variant="user" rank={userRank} role={profile.role} showIcon />
                <div className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>
                  <div className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-2">
                      {profile.about && <span>{profile.about}</span>}
                      {/* Edit Profile Button */}
                      {isOwnProfile && (
                        <Button
                          onClick={onEditProfileClick}
                          variant={theme === 'dark' ? "secondary" : "outline"}
                          size="icon"
                          className="h-5 w-5 inline-flex items-center justify-center"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </span>
                    
                    {/* Social Media Links */}
                    {(profile.facebook_url || profile.instagram_url || profile.twitter_url || profile.linkedin_url) && (
                      <div className="flex items-center justify-center gap-2 md:justify-start">
                        {profile.facebook_url && (
                          <a 
                            href={profile.facebook_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Facebook className="h-4 w-4 text-blue-600" />
                          </a>
                        )}
                        {profile.instagram_url && (
                          <a 
                            href={profile.instagram_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Instagram className="h-4 w-4 text-pink-600" />
                          </a>
                        )}
                        {profile.twitter_url && (
                          <a 
                            href={profile.twitter_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Twitter className="h-4 w-4 text-blue-500" />
                          </a>
                        )}
                        {profile.linkedin_url && (
                          <a 
                            href={profile.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <Linkedin className="h-4 w-4 text-blue-700" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Follow Stats */}
              <div className="w-full flex flex-col items-center gap-2">
                <FollowStats 
                  profileId={profile.id}
                  isOwnProfile={!!isOwnProfile}
                  username={profile.username}
                />
              </div>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden sm:flex items-center gap-8">
            <Avatar className={`h-20 w-20 border-4 ${theme === 'dark' ? 'border-dark-700 bg-dark-700' : 'border-background bg-background'} shadow-lg flex-shrink-0`}>
              {profile?.avatarUrl && !['/placeholder.svg', '/placeholder-brown.svg'].includes(profile.avatarUrl) ? (
                <AvatarImage 
                  src={profile.avatarUrl} 
                  alt={profile.username}
                />
              ) : (
                <AvatarFallback 
                  className="bg-gradient-to-br from-ottoman-600 to-ottoman-800 text-parchment-100 text-xl font-semibold uppercase"
                  delayMs={0}
                >
                  {profile?.username?.charAt(0) || "?"}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-2xl font-serif font-semibold ${theme === 'dark' ? '!text-white' : ''}`}>
                  <span>{profile.username}</span>
                </h1>
                <Badge variant="user" rank={userRank} role={profile.role} showIcon />
              </div>

              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>
                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-2">
                    {profile.about && <span>{profile.about}</span>}
                    {/* Edit Profile Button */}
                    {isOwnProfile && (
                      <Button
                        onClick={handleEditClick}
                        variant={theme === 'dark' ? "secondary" : "outline"}
                        size="icon"
                        className="h-5 w-5 inline-flex items-center justify-center"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </span>
                  
                  {/* Social Media Links */}
                  {(profile.facebook_url || profile.instagram_url || profile.twitter_url || profile.linkedin_url) && (
                    <div className="flex items-center gap-2">
                      {profile.facebook_url && (
                        <a 
                          href={profile.facebook_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Facebook className="h-4 w-4 text-blue-600" />
                        </a>
                      )}
                      {profile.instagram_url && (
                        <a 
                          href={profile.instagram_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Instagram className="h-4 w-4 text-pink-600" />
                        </a>
                      )}
                      {profile.twitter_url && (
                        <a 
                          href={profile.twitter_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Twitter className="h-4 w-4 text-blue-500" />
                        </a>
                      )}
                      {profile.linkedin_url && (
                        <a 
                          href={profile.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Linkedin className="h-4 w-4 text-blue-700" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
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
          </div>
        </div>
      </Card>
    </div>
  );
}
