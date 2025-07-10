import React from 'react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BadgeInfo {
  id: string;
  name: string;
  stage: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon_url: string;
  category: string;
  description?: string;
  threshold_value?: number;
}

interface BadgeDisplayProps {
  badge: BadgeInfo;
  size?: 'sm' | 'md' | 'lg';
  showStage?: boolean;
  className?: string;
  onClick?: () => void;
}

const stageColors = {
  bronze: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  silver: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  platinum: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  diamond: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
};

const sizesConfig = {
  sm: {
    badge: 'h-6 px-2',
    icon: 'w-4 h-4',
    text: 'text-xs'
  },
  md: {
    badge: 'h-8 px-3',
    icon: 'w-5 h-5',
    text: 'text-sm'
  },
  lg: {
    badge: 'h-10 px-4',
    icon: 'w-6 h-6',
    text: 'text-base'
  }
};

export const BadgeDisplay = ({ 
  badge, 
  size = 'md', 
  showStage = false,
  className,
  onClick 
}: BadgeDisplayProps) => {
  const sizeConfig = sizesConfig[size];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-2 cursor-pointer transition-colors duration-200',
        stageColors[badge.stage],
        sizeConfig.badge,
        className
      )}
      onClick={onClick}
    >
      <img 
        src={badge.icon_url} 
        alt={badge.name}
        className={cn('object-contain', sizeConfig.icon)}
      />
      <span className={cn('font-medium', sizeConfig.text)}>
        {badge.name}
        {showStage && (
          <span className="ml-1 opacity-75">
            ({badge.stage})
          </span>
        )}
      </span>
    </Badge>
  );
};

export default BadgeDisplay; 