
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FollowerData {
  follower_id: string;
  following_id: string;
  created_at: string;
  follower_profile?: {
    id: string;
    username: string;
    avatar_url?: string;
    rank?: string;
  };
  following_profile?: {
    id: string;
    username: string;
    avatar_url?: string;
    rank?: string;
  };
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

// Get follow statistics for a user
export async function getFollowStats(userId: string, currentUserId?: string): Promise<FollowStats> {
  try {
    // Get followers count
    const { data: followersData, error: followersError } = await supabase
      .rpc('get_followers_count', { user_id: userId });

    if (followersError) throw followersError;

    // Get following count
    const { data: followingData, error: followingError } = await supabase
      .rpc('get_following_count', { user_id: userId });

    if (followingError) throw followingError;

    // Check if current user is following this user
    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      const { data: isFollowingData, error: isFollowingError } = await supabase
        .rpc('is_following', { 
          follower_user_id: currentUserId, 
          following_user_id: userId 
        });

      if (isFollowingError) throw isFollowingError;
      isFollowing = isFollowingData || false;
    }

    return {
      followersCount: followersData || 0,
      followingCount: followingData || 0,
      isFollowing
    };
  } catch (error) {
    console.error("Error fetching follow stats:", error);
    return {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false
    };
  }
}

// Follow a user
export async function followUser(followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: (await supabase.auth.getUser()).data.user?.id,
        following_id: followingId
      });

    if (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
      return false;
    }

    toast.success("User followed successfully");
    return true;
  } catch (error) {
    console.error("Error in followUser:", error);
    toast.error("Failed to follow user");
    return false;
  }
}

// Unfollow a user
export async function unfollowUser(followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('following_id', followingId);

    if (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
      return false;
    }

    toast.success("User unfollowed successfully");
    return true;
  } catch (error) {
    console.error("Error in unfollowUser:", error);
    toast.error("Failed to unfollow user");
    return false;
  }
}

// Get followers list
export async function getFollowers(userId: string): Promise<FollowerData[]> {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower_id,
        following_id,
        created_at,
        follower_profile:profiles!followers_follower_id_fkey(
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching followers:", error);
    return [];
  }
}

// Get following list
export async function getFollowing(userId: string): Promise<FollowerData[]> {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select(`
        follower_id,
        following_id,
        created_at,
        following_profile:profiles!followers_following_id_fkey(
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching following:", error);
    return [];
  }
}
