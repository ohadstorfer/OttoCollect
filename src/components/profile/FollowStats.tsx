
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getFollowStats, followUser, unfollowUser, getFollowers, getFollowing, FollowStats as FollowStatsType, FollowerData } from '@/services/followService';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import UserProfileLink from '@/components/common/UserProfileLink';
import { Users, UserPlus, UserMinus } from 'lucide-react';

interface FollowStatsProps {
  profileId: string;
  isOwnProfile: boolean;
}

export function FollowStats({ profileId, isOwnProfile }: FollowStatsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);

  // Fetch follow stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['followStats', profileId, user?.id],
    queryFn: () => getFollowStats(profileId, user?.id),
    enabled: !!profileId
  });

  // Fetch followers list
  const { data: followers = [] } = useQuery({
    queryKey: ['followers', profileId],
    queryFn: () => getFollowers(profileId),
    enabled: showFollowersDialog && !!profileId
  });

  // Fetch following list
  const { data: following = [] } = useQuery({
    queryKey: ['following', profileId],
    queryFn: () => getFollowing(profileId),
    enabled: showFollowingDialog && !!profileId
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStats', profileId] });
    }
  });

  // Unfollow mutation
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

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-6 animate-pulse">
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
        <div className="h-8 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Followers Count */}
      <button
        onClick={() => setShowFollowersDialog(true)}
        className="flex flex-col items-center hover:opacity-70 transition-opacity"
      >
        <span className="font-bold text-lg">{stats.followersCount}</span>
        <span className="text-sm text-muted-foreground">
          {stats.followersCount === 1 ? 'Follower' : 'Followers'}
        </span>
      </button>

      {/* Following Count */}
      <button
        onClick={() => setShowFollowingDialog(true)}
        className="flex flex-col items-center hover:opacity-70 transition-opacity"
      >
        <span className="font-bold text-lg">{stats.followingCount}</span>
        <span className="text-sm text-muted-foreground">Following</span>
      </button>

      {/* Follow/Unfollow Button */}
      {!isOwnProfile && user && (
        <Button
          onClick={handleFollowToggle}
          disabled={followMutation.isPending || unfollowMutation.isPending}
          variant={stats.isFollowing ? "outline" : "default"}
          size="sm"
          className="min-w-[100px]"
        >
          {stats.isFollowing ? (
            <>
              <UserMinus className="h-4 w-4 mr-2" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Follow
            </>
          )}
        </Button>
      )}

      {/* Followers Dialog */}
      <Dialog open={showFollowersDialog} onOpenChange={setShowFollowersDialog}>
        <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Followers
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {followers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No followers yet</p>
              ) : (
                followers.map((follower) => (
                  <div key={follower.follower_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follower.follower_profile?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(follower.follower_profile?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <UserProfileLink
                          userId={follower.follower_id}
                          username={follower.follower_profile?.username || 'Unknown'}
                          showAvatar={false}
                          className="font-medium hover:underline"
                        />
                        {follower.follower_profile?.rank && (
                          <Badge variant="user" rank={follower.follower_profile.rank} size="sm" />
                        )}
                      </div>
                    </div>
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
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Following
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {following.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
              ) : (
                following.map((follow) => (
                  <div key={follow.following_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={follow.following_profile?.avatar_url} />
                        <AvatarFallback>
                          {getInitials(follow.following_profile?.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <UserProfileLink
                          userId={follow.following_id}
                          username={follow.following_profile?.username || 'Unknown'}
                          showAvatar={false}
                          className="font-medium hover:underline"
                        />
                        {follow.following_profile?.rank && (
                          <Badge variant="user" rank={follow.following_profile.rank} size="sm" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
