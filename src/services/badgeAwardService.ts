
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  userId: string;
  rareCount: number;
  totalCount: number;
  forumPostCount: number;
  followerCount: number;
}

interface Badge {
  id: string;
  category: string;
  stage: string;
  threshold_value: number;
  name: string;
}

export async function awardHistoricalBadges() {
  try {
    console.log('Starting historical badge award process...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users to process`);

    // Get all badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('category, threshold_value');
    
    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return;
    }

    console.log(`Found ${badges.length} badges available`);

    // Process each user
    for (const user of users) {
      console.log(`Processing user: ${user.username} (${user.id})`);
      
      // Get user stats
      const stats = await getUserStats(user.id);
      console.log(`User stats:`, stats);
      
      // Award badges based on stats
      await awardBadgesForUser(user.id, stats, badges);
    }

    console.log('Historical badge award process completed');
  } catch (error) {
    console.error('Error in historical badge award process:', error);
  }
}

async function getUserStats(userId: string): Promise<UserStats> {
  try {
    // Get rare banknotes count
    const { data: rareItems, error: rareError } = await supabase
      .from('collection_items')
      .select(`
        id,
        detailed_banknotes!inner(rarity)
      `)
      .eq('user_id', userId)
      .not('detailed_banknotes.rarity', 'is', null)
      .neq('detailed_banknotes.rarity', '');

    const rareCount = rareError ? 0 : (rareItems?.length || 0);

    // Get total collection count
    const { data: totalItems, error: totalError } = await supabase
      .from('collection_items')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    const totalCount = totalError ? 0 : (totalItems?.length || 0);

    // Get forum posts count
    const { data: forumPosts, error: forumError } = await supabase
      .from('forum_posts')
      .select('id', { count: 'exact' })
      .eq('author_id', userId);

    const forumPostCount = forumError ? 0 : (forumPosts?.length || 0);

    // Get followers count
    const { data: followers, error: followersError } = await supabase
      .from('followers')
      .select('id', { count: 'exact' })
      .eq('following_id', userId);

    const followerCount = followersError ? 0 : (followers?.length || 0);

    return {
      userId,
      rareCount,
      totalCount,
      forumPostCount,
      followerCount
    };
  } catch (error) {
    console.error(`Error getting stats for user ${userId}:`, error);
    return {
      userId,
      rareCount: 0,
      totalCount: 0,
      forumPostCount: 0,
      followerCount: 0
    };
  }
}

async function awardBadgesForUser(userId: string, stats: UserStats, badges: Badge[]) {
  try {
    // Get existing user badges to avoid duplicates
    const { data: existingBadges, error: existingError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    if (existingError) {
      console.error(`Error fetching existing badges for user ${userId}:`, existingError);
      return;
    }

    const existingBadgeIds = new Set(existingBadges?.map(b => b.badge_id) || []);

    const badgesToAward: string[] = [];

    // Check each category and award highest eligible badge
    const categories = ['rare_banknotes', 'add_banknotes', 'forum_posts', 'social_engagement'];
    
    for (const category of categories) {
      const categoryBadges = badges
        .filter(b => b.category === category)
        .sort((a, b) => b.threshold_value - a.threshold_value); // Highest first

      let userValue = 0;
      switch (category) {
        case 'rare_banknotes':
          userValue = stats.rareCount;
          break;
        case 'add_banknotes':
          userValue = stats.totalCount;
          break;
        case 'forum_posts':
          userValue = stats.forumPostCount;
          break;
        case 'social_engagement':
          userValue = stats.followerCount;
          break;
      }

      console.log(`Category ${category}: user has ${userValue}, checking badges...`);

      // Find all badges user qualifies for in this category
      const qualifiedBadges = categoryBadges.filter(badge => 
        userValue >= badge.threshold_value && !existingBadgeIds.has(badge.id)
      );

      // Award all qualified badges (not just the highest)
      for (const badge of qualifiedBadges) {
        console.log(`User qualifies for badge: ${badge.name} (${badge.stage})`);
        badgesToAward.push(badge.id);
      }
    }

    // Award all qualified badges
    if (badgesToAward.length > 0) {
      const badgeInserts = badgesToAward.map(badgeId => ({
        user_id: userId,
        badge_id: badgeId,
        awarded_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('user_badges')
        .insert(badgeInserts);

      if (insertError) {
        console.error(`Error awarding badges for user ${userId}:`, insertError);
      } else {
        console.log(`Awarded ${badgesToAward.length} badges to user ${userId}`);
      }
    } else {
      console.log(`No new badges to award for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error awarding badges for user ${userId}:`, error);
  }
}

// Function to award badges for a specific user (can be called individually)
export async function awardBadgesForSpecificUser(userId: string) {
  try {
    console.log(`Checking badges for specific user: ${userId}`);
    
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .single();
    
    if (userError || !users) {
      console.error('User not found:', userError);
      return;
    }

    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .order('category, threshold_value');
    
    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return;
    }

    const stats = await getUserStats(userId);
    await awardBadgesForUser(userId, stats, badges);
    
    console.log(`Badge check completed for user: ${users.username}`);
  } catch (error) {
    console.error('Error in specific user badge award:', error);
  }
}
