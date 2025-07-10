
import { supabase } from '@/integrations/supabase/client';
import { BadgeInfo } from '@/components/badges/BadgeDisplay';

export interface BadgeCategory {
  name: string;
  badges: BadgeInfo[];
  currentValue: number;
  nextThreshold?: number;
}

export async function getUserBadges(userId: string): Promise<BadgeInfo[]> {
  try {
    console.log('getUserBadges - Starting fetch for userId:', userId);
    
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        badges (
          id,
          name,
          description,
          category,
          stage,
          threshold_value,
          icon_url
        )
      `)
      .eq('user_id', userId);

    console.log('getUserBadges - Raw response:', { data, error });

    if (error) {
      console.error('getUserBadges - Supabase error:', error);
      throw error;
    }

    const badges = data?.map(item => ({
      id: item.badges.id,
      name: item.badges.name,
      stage: item.badges.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
      icon_url: item.badges.icon_url,
      category: item.badges.category,
      description: item.badges.description,
      threshold_value: item.badges.threshold_value
    })) || [];

    console.log('getUserBadges - Processed badges:', badges);
    return badges;
  } catch (error) {
    console.error('getUserBadges - Error fetching user badges:', error);
    return [];
  }
}

export async function getUserBadgeCategories(userId: string): Promise<BadgeCategory[]> {
  try {
    console.log('getUserBadgeCategories - Starting for userId:', userId);
    
    // First get all badges for the user
    const userBadges = await getUserBadges(userId);
    console.log('getUserBadgeCategories - User badges:', userBadges);
    
    // Then get all badge definitions to calculate progress
    const { data: allBadges, error } = await supabase
      .from('badges')
      .select('*')
      .order('threshold_value', { ascending: true });

    console.log('getUserBadgeCategories - All badges query:', { data: allBadges, error });

    if (error) {
      console.error('getUserBadgeCategories - Error fetching all badges:', error);
      throw error;
    }

    // Get user's stats for different categories
    const { data: userStats, error: statsError } = await supabase
      .rpc('get_user_badge_stats', { user_id_param: userId });

    console.log('getUserBadgeCategories - User stats query:', { data: userStats, error: statsError });

    if (statsError) {
      console.error('getUserBadgeCategories - Error fetching user stats:', statsError);
      throw statsError;
    }

    // Group badges by category and calculate progress
    const categories = allBadges.reduce((acc: { [key: string]: BadgeCategory }, badge) => {
      if (!acc[badge.category]) {
        const categoryStats = userStats.find((stat: any) => stat.category === badge.category);
        const currentValue = categoryStats?.current_value || 0;
        
        console.log(`getUserBadgeCategories - Category ${badge.category} stats:`, { currentValue, categoryStats });
        
        acc[badge.category] = {
          name: formatCategoryName(badge.category),
          badges: [],
          currentValue,
          nextThreshold: undefined
        };
      }
      
      // Add badge to category if user has earned it
      const userHasBadge = userBadges.some(ub => ub.id === badge.id);
      console.log(`getUserBadgeCategories - Badge ${badge.name} (${badge.id}) earned:`, userHasBadge);
      
      if (userHasBadge) {
        acc[badge.category].badges.push({
          id: badge.id,
          name: badge.name,
          stage: badge.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
          icon_url: badge.icon_url,
          category: badge.category,
          description: badge.description,
          threshold_value: badge.threshold_value
        });
      }
      
      // Update next threshold if this is the next badge to earn
      const currentValue = acc[badge.category].currentValue;
      if (currentValue < badge.threshold_value && 
          (!acc[badge.category].nextThreshold || 
           badge.threshold_value < acc[badge.category].nextThreshold)) {
        acc[badge.category].nextThreshold = badge.threshold_value;
      }
      
      return acc;
    }, {});

    const result = Object.values(categories);
    console.log('getUserBadgeCategories - Final categories:', result);
    return result;
  } catch (error) {
    console.error('getUserBadgeCategories - Error fetching badge categories:', error);
    return [];
  }
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function getHighestBadge(userId: string): Promise<BadgeInfo | null> {
  try {
    console.log('getHighestBadge - Starting for userId:', userId);
    
    const { data, error } = await supabase
      .rpc('get_user_highest_badges', { user_id_param: userId });

    console.log('getHighestBadge - RPC response:', { data, error });

    if (error) {
      console.error('getHighestBadge - RPC error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('getHighestBadge - No badges found for user');
      return null;
    }

    // Find the highest stage badge
    const stageOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const highestBadge = data.reduce((highest: BadgeInfo | null, current: any) => {
      const currentBadge = {
        id: current.id,
        name: current.name,
        stage: current.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
        icon_url: current.icon_url,
        category: current.category,
        threshold_value: current.threshold_value
      };
      
      if (!highest) return currentBadge;
      
      const isHigher = stageOrder.indexOf(current.stage) > stageOrder.indexOf(highest.stage);
      console.log('getHighestBadge - Comparing badges:', { 
        current: currentBadge, 
        highest, 
        isHigher 
      });
      
      return isHigher ? currentBadge : highest;
    }, null);
    
    console.log('getHighestBadge - Final highest badge:', highestBadge);
    return highestBadge;
  } catch (error) {
    console.error('getHighestBadge - Error fetching highest badge:', error);
    return null;
  }
} 
