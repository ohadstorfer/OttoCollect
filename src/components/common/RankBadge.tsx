import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRank } from '@/types';

interface RankBadgeProps {
  rank: UserRank;
  size?: 'sm' | 'md' | 'lg';
  showPoints?: boolean;
  points?: number;
}

export default function RankBadge({ rank, size = 'md', showPoints = false, points }: RankBadgeProps) {
  const getRankColor = (userRank: UserRank) => {
    if (userRank.includes('Super Admin')) {
      return 'bg-red-600 text-white border-red-700';
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

  const getDisplayRank = (userRank: UserRank) => {
    if (userRank.includes('Super Admin')) {
      // Replace "Super Admin" with "Admin" and keep the collector rank
      return userRank.replace('Super Admin ', 'Admin ');
    }
    return userRank;
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
