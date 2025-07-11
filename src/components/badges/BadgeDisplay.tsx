
import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export interface BadgeInfo {
  id: string;
  name: string;
  stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Stage 5';
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
  'Stage 1': '#D4A76A',   // Light brown color
  'Stage 2': '#CD7F32',   // Bronze color
  'Stage 3': '#ADD8E6',   // Light blue color
  'Stage 4': '#C0C0C0',   // Silver color
  'Stage 5': '#FFD700'    // Gold color
};

const sizesConfig = {
  sm: {
    container: 'h-8 w-8',
    icon: 'h-5 w-5'
  },
  md: {
    container: 'h-10 w-10',
    icon: 'h-6 w-6'
  },
  lg: {
    container: 'h-12 w-12',
    icon: 'h-7 w-7'
  }
};

const BadgeIcon = ({ color, className }: { color: string; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 -960 960 960" 
    className={className}
    fill={color}
  >
    <path d="m387-412 35-114-92-74h114l36-112 36 112h114l-93 74 35 114-92-71-93 71ZM240-40v-309q-38-42-59-96t-21-115q0-134 93-227t227-93q134 0 227 93t93 227q0 61-21 115t-59 96v309l-240-80-240 80Zm240-280q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70ZM320-159l160-41 160 41v-124q-35 20-75.5 31.5T480-240q-44 0-84.5-11.5T320-283v124Zm160-62Z"/>
  </svg>
);

export const BadgeDisplay = ({ 
  badge, 
  size = 'md', 
  showStage = false,
  className,
  onClick 
}: BadgeDisplayProps) => {
  const sizeConfig = sizesConfig[size];
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            'rounded-full border-2 flex items-center justify-center transition-all duration-200',
            stageColors[badge.stage],
            sizeConfig.container,
            className
          )}
          onClick={onClick}
          onTouchStart={handleTouchStart}
          style={{ touchAction: 'none' }}
        >
          <BadgeIcon 
            color={stageColors[badge.stage]} 
            className={cn('transition-transform duration-200', sizeConfig.icon)} 
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BadgeIcon color={stageColors[badge.stage]} className="h-6 w-6" />
            <h4 className="font-semibold"><span>{badge.name}</span></h4>
          </div>
          {badge.description && (
            <p className="text-sm text-muted-foreground">
              {badge.description}
            </p>
          )}
          {showStage && (
            <p className="text-xs text-muted-foreground capitalize">
              {badge.stage}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default BadgeDisplay;
