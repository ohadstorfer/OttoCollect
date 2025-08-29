
import { supabase } from '@/integrations/supabase/client';
import { BadgeInfo } from '@/components/badges/BadgeDisplay';

export interface BadgeCategory {
  name: string;
  name_ar?: string;
  name_tr?: string;
  badges: BadgeInfo[];
  currentValue: number;
  nextThreshold?: number;
}

interface BadgeResponse {
  badges: {
    id: string;
    name: string;
    description: string;
    category: string;
    stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5';
    threshold_value: number;
    icon_url: string;
  };
}

interface UserStats {
  category: string;
  current_value: number;
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
          icon_url,
          name_ar,
          name_tr,
          description_ar,
          description_tr
        )
      `)
      .eq('user_id', userId);

    console.log('getUserBadges - Raw response:', { data, error });

    if (error) {
      console.error('getUserBadges - Supabase error:', error);
      throw error;
    }

    if (!data) return [];

    const badges = data.map(item => ({
      id: (item.badges as any).id,
      name: (item.badges as any).name,
      stage: (item.badges as any).stage as 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5',
      icon_url: (item.badges as any).icon_url,
      category: (item.badges as any).category,
      description: (item.badges as any).description,
      threshold_value: (item.badges as any).threshold_value,
      name_ar: (item.badges as any).name_ar,
      name_tr: (item.badges as any).name_tr,
      description_ar: (item.badges as any).description_ar,
      description_tr: (item.badges as any).description_tr
    }));

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

    if (!allBadges) return [];

    // Get user's stats for different categories
    const { data: userStats, error: statsError } = await supabase
      .rpc('get_user_badge_stats', { user_id_param: userId });

    console.log('getUserBadgeCategories - User stats query:', { data: userStats, error: statsError });

    if (statsError) {
      console.error('getUserBadgeCategories - Error fetching user stats:', statsError);
      throw statsError;
    }

    if (!userStats) return [];

    // Group badges by category and calculate progress
    const categories = allBadges.reduce<Record<string, BadgeCategory>>((acc, badge) => {
      if (!acc[badge.category]) {
        const categoryStats = (userStats as UserStats[]).find(stat => stat.category === badge.category);
        const currentValue = categoryStats?.current_value || 0;
        
        console.log(`getUserBadgeCategories - Category ${badge.category} stats:`, { currentValue, categoryStats });
        
        const categoryInfo = formatCategoryName(badge.category);
        acc[badge.category] = {
          name: categoryInfo.name,
          name_ar: categoryInfo.name_ar,
          name_tr: categoryInfo.name_tr,
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
          stage: badge.stage as 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5',
          icon_url: badge.icon_url,
          category: badge.category,
          description: badge.description,
          threshold_value: badge.threshold_value,
          name_ar: badge.name_ar,
          name_tr: badge.name_tr,
          description_ar: badge.description_ar,
          description_tr: badge.description_tr
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

function formatCategoryName(category: string, language: string = 'en'): { name: string; name_ar?: string; name_tr?: string } {
  const baseName = category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Define translations for category names
  const categoryTranslations: Record<string, { name_ar: string; name_tr: string }> = {
    'wish_list': {
      name_ar: 'قائمة الأمنيات',
      name_tr: 'İstek Listesi'
    },
    'forum_posts': {
      name_ar: 'منشورات المنتدى',
      name_tr: 'Forum Gönderileri'
    },
    'rare_banknotes': {
      name_ar: 'الأوراق النقدية النادرة',
      name_tr: 'Nadir Banknotlar'
    },
    'add_banknotes': {
      name_ar: 'إضافة الأوراق النقدية',
      name_tr: 'Banknot Ekle'
    },
    'social_engagement': {
      name_ar: 'التفاعل الاجتماعي',
      name_tr: 'Sosyal Etkileşim'
    }
  };
  
  const translations = categoryTranslations[category.toLowerCase()];
  
  return {
    name: baseName,
    name_ar: translations?.name_ar,
    name_tr: translations?.name_tr
  };
}

export async function getHighestBadge(userId: string): Promise<BadgeInfo | null> {
  try {
    console.log('getHighestBadge - Starting for userId:', userId);
    
    // Add retry logic
    let retries = 3;
    let data;
    let error;
    
    while (retries > 0) {
      const result = await supabase
        .rpc('get_user_highest_badges', { user_id_param: userId });
      
      data = result.data;
      error = result.error;
      
      if (!error && data) break;
      
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

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
    const stageOrder = ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5'];
    const highestBadge = data.reduce((highest: BadgeInfo | null, current: any) => {
      const currentBadge = {
        id: current.id,
        name: current.name,
        stage: current.stage as 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5',
        icon_url: current.icon_url,
        category: current.category,
        threshold_value: current.threshold_value,
        description: current.description,
        name_ar: current.name_ar,
        name_tr: current.name_tr,
        description_ar: current.description_ar,
        description_tr: current.description_tr
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

export async function checkAndAwardBadges(userId: string): Promise<void> {
  try {
    console.log('checkAndAwardBadges - Starting for userId:', userId);
    
    const { error } = await supabase
      .rpc('check_and_award_badges_for_user', { user_id_to_check: userId });

    if (error) {
      console.error('checkAndAwardBadges - Error:', error);
      throw error;
    }

    console.log('checkAndAwardBadges - Successfully checked and awarded badges');
  } catch (error) {
    console.error('checkAndAwardBadges - Failed:', error);
    throw error;
  }
}
