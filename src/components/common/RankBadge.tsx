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
    switch (userRank) {
      case 'Master Collector':
        return 'bg-purple-600 text-white border-purple-700';
      case 'Advance Collector':
        return 'bg-indigo-600 text-white border-indigo-700';
      case 'Known Collector':
        return 'bg-blue-600 text-white border-blue-700';
      case 'Mid Collector':
        return 'bg-green-600 text-white border-green-700';
      case 'Beginner Collector':
        return 'bg-yellow-600 text-white border-yellow-700';
      case 'Newbie Collector':
        return 'bg-orange-500 text-white border-orange-600';
      default:
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
      'Master Collector': 'ranks.masterCollector'
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
