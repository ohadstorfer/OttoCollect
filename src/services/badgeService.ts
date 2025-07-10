
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

    if (error) throw error;

    return data?.map(item => ({
      id: item.badges.id,
      name: item.badges.name,
      stage: item.badges.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
      icon_url: item.badges.icon_url,
      category: item.badges.category,
      description: item.badges.description,
      threshold_value: item.badges.threshold_value
    })) || [];
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}

export async function getUserBadgeCategories(userId: string): Promise<BadgeCategory[]> {
  try {
    // First get all badges for the user
    const userBadges = await getUserBadges(userId);
    
    // Then get all badge definitions to calculate progress
    const { data: allBadges, error } = await supabase
      .from('badges')
      .select('*')
      .order('threshold_value', { ascending: true });

    if (error) throw error;

    // Get user's stats for different categories
    const { data: userStats, error: statsError } = await supabase
      .rpc('get_user_badge_stats', { user_id_param: userId });

    if (statsError) throw statsError;

    // Group badges by category and calculate progress
    const categories = allBadges.reduce((acc: { [key: string]: BadgeCategory }, badge) => {
      if (!acc[badge.category]) {
        const categoryStats = userStats.find((stat: any) => stat.category === badge.category);
        const currentValue = categoryStats?.current_value || 0;
        
        acc[badge.category] = {
          name: formatCategoryName(badge.category),
          badges: [],
          currentValue,
          nextThreshold: undefined
        };
      }
      
      // Add badge to category if user has earned it
      const userHasBadge = userBadges.some(ub => ub.id === badge.id);
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

    return Object.values(categories);
  } catch (error) {
    console.error('Error fetching badge categories:', error);
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
    const { data, error } = await supabase
      .rpc('get_user_highest_badges', { user_id_param: userId });

    if (error) throw error;
    
    if (!data || data.length === 0) return null;

    // Find the highest stage badge
    const stageOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    return data.reduce((highest: BadgeInfo | null, current: any) => {
      if (!highest) return {
        id: current.id,
        name: current.name,
        stage: current.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
        icon_url: current.icon_url,
        category: current.category,
        threshold_value: current.threshold_value
      };
      
      const currentBadge = {
        id: current.id,
        name: current.name,
        stage: current.stage as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
        icon_url: current.icon_url,
        category: current.category,
        threshold_value: current.threshold_value
      };
      
      return stageOrder.indexOf(current.stage) > stageOrder.indexOf(highest.stage) ? currentBadge : highest;
    }, null);
  } catch (error) {
    console.error('Error fetching highest badge:', error);
    return null;
  }
} 
