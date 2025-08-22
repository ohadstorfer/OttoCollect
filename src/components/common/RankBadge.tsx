import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRank } from '@/types';
import { useTranslation } from 'react-i18next';

interface RankBadgeProps {
  rank: UserRank;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  points?: number;
}

export default function RankBadge({ rank, size = 'md', showPoints = false, points }: RankBadgeProps) {
  const { t } = useTranslation(['badges']);
  const getRankColor = (userRank: UserRank) => {
    if (userRank.includes('Super Admin')) {
      return 'bg-gray-500 text-white border-gray-600';
    } else if (userRank.includes('Admin')) {
      return 'bg-red-500 text-white border-red-600';
    } else if (userRank === 'Master Collector') {
      return 'bg-purple-600 text-white border-purple-700';
    } else if (userRank === 'Advance Collector') {
      return 'bg-indigo-600 text-white border-indigo-700';
    } else if (userRank === 'Known Collector') {
      return 'bg-blue-600 text-white border-blue-700';
    } else if (userRank === 'Mid Collector') {
      return 'bg-green-600 text-white border-green-700';
    } else if (userRank === 'Beginner Collector') {
      return 'bg-yellow-600 text-white border-yellow-700';
    } else {
      return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'text-xs px-1.5 py-0.5';
      case 'lg': return 'text-base px-3 py-1';
      default: return 'text-sm px-2 py-1';
    }
  };

  const getRankTranslationKey = (userRank: UserRank): string => {
    // Map the rank strings to translation keys
    const rankMap: Record<string, string> = {
      'Newbie Collector': 'ranks.newbieCollector',
      'Beginner Collector': 'ranks.beginnerCollector',
      'Mid Collector': 'ranks.midCollector',
      'Known Collector': 'ranks.knownCollector',
      'Advance Collector': 'ranks.advanceCollector',
      'Master Collector': 'ranks.masterCollector',
      'Admin Newbie Collector': 'ranks.adminNewbieCollector',
      'Admin Beginner Collector': 'ranks.adminBeginnerCollector',
      'Admin Mid Collector': 'ranks.adminMidCollector',
      'Admin Known Collector': 'ranks.adminKnownCollector',
      'Admin Advance Collector': 'ranks.adminAdvanceCollector',
      'Admin Master Collector': 'ranks.adminMasterCollector',
      'Super Admin Newbie Collector': 'ranks.superAdminNewbieCollector',
      'Super Admin Beginner Collector': 'ranks.superAdminBeginnerCollector',
      'Super Admin Mid Collector': 'ranks.superAdminMidCollector',
      'Super Admin Known Collector': 'ranks.superAdminKnownCollector',
      'Super Admin Advance Collector': 'ranks.superAdminAdvanceCollector',
      'Super Admin Master Collector': 'ranks.superAdminMasterCollector'
    };
    
    return rankMap[userRank] || userRank;
  };

  const getDisplayRank = (userRank: UserRank) => {
    const translationKey = getRankTranslationKey(userRank);
    return t(translationKey);
  };

  return (
    <Badge 
      className={`${getRankColor(rank)} ${getSizeClass()} font-medium border`}
      variant="secondary"
    >
      {getDisplayRank(rank)}
      {showPoints && points !== undefined && (
        <span className="ml-1 opacity-90">({points} pts)</span>
      )}
    </Badge>
  );
}
