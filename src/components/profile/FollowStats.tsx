import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getFollowStats, followUser, unfollowUser, getFollowers, getFollowing } from '@/services/followService';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Users, UserPlus, User, MessageCircle } from 'lucide-react';
import { SendMessage } from '@/components/messages/SendMessage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from "@/context/ThemeContext";
import BadgesDialog from '../badges/BadgesDialog';
import BadgeDisplay, { BadgeInfo } from '../badges/BadgeDisplay';
import { getHighestBadge, getUserBadgeCategories, checkAndAwardBadges, BadgeCategory } from '@/services/badgeService';

interface FollowStatsProps {
  profileId: string;
  isOwnProfile: boolean;
  username: string;
  showBadges?: boolean;
}

const UserProfileWrapper = ({ 
  userId, 
  username, 
  onNavigate, 
  children 
}: { 
  userId: string; 
  username: string; 
  onNavigate: () => void; 
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate();
    navigate(`/profile/${username}`);
  };

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  );
};

export function FollowStats({ profileId, isOwnProfile, username, showBadges = false }: FollowStatsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showBadgesDialog, setShowBadgesDialog] = useState(showBadges);

  // Update dialog state when showBadges prop changes and clear URL parameter
  React.useEffect(() => {
    if (showBadges) {
      setShowBadgesDialog(true);
      // Clear the showBadges parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('showBadges');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [showBadges, searchParams, setSearchParams]);

  // Use React Query for badge data
  const { data: highestBadge, isLoading: badgeLoading } = useQuery({
    queryKey: ['highest-badge', profileId],
    queryFn: () => getHighestBadge(profileId),
    enabled: !!profileId
  });

  const { data: badgeCategories = [], isLoading: badgeCategoriesLoading } = useQuery({
    queryKey: ['badge-categories', profileId],
    queryFn: async () => {
      await checkAndAwardBadges(profileId);
      return getUserBadgeCategories(profileId);
    },
    enabled: !!profileId && showBadgesDialog // Only fetch when dialog is open
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['followStats', profileId, user?.id],
    queryFn: () => getFollowStats(profileId, user?.id),
    enabled: !!profileId
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', profileId],
    queryFn: () => getFollowers(profileId),
    enabled: showFollowersDialog && !!profileId
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', profileId],
    queryFn: () => getFollowing(profileId),
    enabled: showFollowingDialog && !!profileId
  });

  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStats', profileId] });
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStats', profileId] });
    }
  });

  const handleFollowToggle = () => {
    if (!user) return;
    
    if (stats?.isFollowing) {
      unfollowMutation.mutate(profileId);
    } else {
      followMutation.mutate(profileId);
    }
  };

  const handleMessageClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowMessageDialog(true);
  };

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="flex gap-6">
          {/* Followers Skeleton */}
          <div className="h-6 w-20 bg-gray-200 rounded"></div>
          {/* Following Skeleton */}
          <div className="h-6 w-20 bg-gray-200 rounded"></div>
          {/* Badges Skeleton */}
          <div className="h-6 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
          <div className="h-8 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stats Row */}
      <div className="flex gap-6">
        {/* Followers Count */}
        <button
          onClick={() => setShowFollowersDialog(true)}
          className="flex flex-col items-center hover:opacity-70 transition-opacity"
        >
          <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-100' : ''}`}>{stats.followersCount}</span>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>
            {stats.followersCount === 1 ? 'Follower' : 'Followers'}
          </span>
        </button>
        

        {/* Following Count */}
        <button
          onClick={() => setShowFollowingDialog(true)}
          className="flex flex-col items-center hover:opacity-70 transition-opacity"
        >
          <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-100' : ''}`}>{stats.followingCount}</span>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>Following</span>
        </button>

        {/* Badges Count */}
        <button
          onClick={() => setShowBadgesDialog(true)}
          className="flex flex-col items-center hover:opacity-70 transition-opacity"
        >
          <div className="flex items-center justify-center h-[28px]">
            {badgeLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-ottoman-600 animate-spin" />
            ) : highestBadge ? (
              <BadgeDisplay 
                badge={highestBadge} 
                size="sm" 
                className="scale-90 transform-gpu" 
              />
            ) : (
              <span className={`font-bold text-lg ${theme === 'dark' ? 'text-gray-100' : ''}`}>0</span>
            )}
          </div>
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-muted-foreground'}`}>Badges</span>
        </button>
      </div>

      {/* Action Buttons */}
      {!isOwnProfile && user && (
        <div className="flex gap-2">
          <Button
            onClick={handleFollowToggle}
            disabled={followMutation.isPending || unfollowMutation.isPending}
            variant={stats.isFollowing ? "default" : "outline"}
            size="sm"
            className="min-w-[100px]"
          >
            {stats.isFollowing ? (
              <>
                <User className="h-4 w-4 mr-2" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Follow
              </>
            )}
          </Button>

          <Button
            onClick={handleMessageClick}
            className="min-w-[100px]"
            variant="outline"
            size="sm"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
        </div>
      )}

      {/* Followers Dialog */}
      <Dialog open={showFollowersDialog} onOpenChange={setShowFollowersDialog}>
        <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 mt-2">
              <Users className="h-5 w-5" />
              <span>Followers</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {followers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No followers yet</p>
              ) : (
                followers.map((follower) => (
                  <div key={follower.follower_id} className="flex items-center justify-between">
                    <UserProfileWrapper
                      userId={follower.follower_id}
                      username={follower.follower_profile?.username || 'Unknown'}
                      onNavigate={() => setShowFollowersDialog(false)}
                    >
                      <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follower.follower_profile?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(follower.follower_profile?.username || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{follower.follower_profile?.username || 'Unknown'}</div>
                          {follower.follower_profile?.rank && (
                            <Badge variant="user" rank={follower.follower_profile.rank} role={follower.follower_profile.role} className="text-xs" />
                          )}
                        </div>
                      </div>
                    </UserProfileWrapper>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={showFollowingDialog} onOpenChange={setShowFollowingDialog}>
        <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 mt-2">
              <Users className="h-5 w-5" />
              <span>Following</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {following.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
              ) : (
                following.map((follow) => (
                  <div key={follow.following_id} className="flex items-center justify-between">
                    <UserProfileWrapper
                      userId={follow.following_id}
                      username={follow.following_profile?.username || 'Unknown'}
                      onNavigate={() => setShowFollowingDialog(false)}
                    >
                      <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follow.following_profile?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(follow.following_profile?.username || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{follow.following_profile?.username || 'Unknown'}</div>
                          {follow.following_profile?.rank && (
                            <Badge variant="user" rank={follow.following_profile.rank} role={follow.following_profile.role} className="text-xs" />
                          )}
                        </div>
                      </div>
                    </UserProfileWrapper>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      {!isOwnProfile && user && (
        <SendMessage
          receiverId={profileId}
          receiverName={username}
          isOpen={showMessageDialog}
          onOpenChange={setShowMessageDialog}
        />
      )}


      {/* Badges Dialog */}
      <BadgesDialog
        open={showBadgesDialog}
        onOpenChange={setShowBadgesDialog}
        userBadges={highestBadge ? [highestBadge] : []}
        badgeCategories={badgeCategories}
        isLoading={badgeCategoriesLoading}
      />
      
    </div>
  );
}
