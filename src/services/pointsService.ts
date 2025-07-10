
import { supabase } from '@/integrations/supabase/client';
import { UserRank } from '@/types';

export interface PointTransaction {
  action: string;
  points: number;
  userId: string;
}

// Award points and update rank via database function
export async function awardPoints(userId: string, points: number, action?: string): Promise<boolean> {
  try {
    console.log(`Awarding ${points} points to user ${userId} for action: ${action}`);
    
    const { error } = await supabase.rpc('award_points_and_update_rank', {
      user_id_param: userId,
      points_to_add: points
    });

    if (error) {
      console.error('Error awarding points:', error);
      return false;
    }

    console.log(`Successfully awarded ${points} points to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error in awardPoints:', error);
    return false;
  }
}

// Calculate rank based on points and role (client-side helper)
export function calculateRank(points: number, role: string): UserRank {
  let baseRank: string;
  
  if (points <= 19) {
    baseRank = 'Newbie Collector';
  } else if (points <= 79) {
    baseRank = 'Beginner Collector';
  } else if (points <= 399) {
    baseRank = 'Mid Collector';
  } else if (points <= 999) {
    baseRank = 'Known Collector';
  } else if (points <= 1999) {
    baseRank = 'Advance Collector';
  } else {
    baseRank = 'Master Collector';
  }

  // Add role prefix for admins
  if (role && role.toLowerCase().includes('admin')) {
    if (role === 'Super Admin') {
      return `Super Admin ${baseRank}` as UserRank;
    } else {
      return `Admin ${baseRank}` as UserRank;
    }
  }

  return baseRank as UserRank;
}

// Get points needed for next rank
export function getPointsForNextRank(currentPoints: number): { nextRank: string; pointsNeeded: number } | null {
  const thresholds = [
    { points: 20, rank: 'Beginner Collector' },
    { points: 80, rank: 'Mid Collector' },
    { points: 400, rank: 'Known Collector' },
    { points: 1000, rank: 'Advance Collector' },
    { points: 2000, rank: 'Master Collector' },
  ];

  for (const threshold of thresholds) {
    if (currentPoints < threshold.points) {
      return {
        nextRank: threshold.rank,
        pointsNeeded: threshold.points - currentPoints
      };
    }
  }

  return null; // Already at max rank
}
