
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { BadgeDisplay, BadgeInfo } from './BadgeDisplay';
import { BadgeCategory } from '@/services/badgeService';
import { Card } from "@/components/ui/card";

interface BadgesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBadges: BadgeInfo[];
  badgeCategories: BadgeCategory[];
  isLoading?: boolean;
}

// Ghost badge skeleton component
const GhostBadge = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse">
    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600"></div>
    <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
  </div>
);

// Ghost category card skeleton
const GhostCategoryCard = () => (
  <Card className="p-4 space-y-3">
    <div className="flex items-center justify-between mb-2">
      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
    
    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    
    <div className="flex flex-wrap gap-2 pt-2">
      <GhostBadge />
      <GhostBadge />
      <GhostBadge />
      <GhostBadge />
    </div>
  </Card>
);

export const BadgesDialog = ({
  open,
  onOpenChange,
  userBadges,
  badgeCategories,
  isLoading = false
}: BadgesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            <span>Achievements</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
            {isLoading ? (
              // Loading skeleton - show 4 ghost category cards
              <>
                <GhostCategoryCard />
                <GhostCategoryCard />
                <GhostCategoryCard />
                <GhostCategoryCard />
              </>
            ) : (
              // Actual content
              badgeCategories.map((category) => {
                const progress = category.nextThreshold 
                  ? (category.currentValue / category.nextThreshold) * 100
                  : 100;
                  
                return (
                  <Card key={category.name} className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium"><span>{category.name}</span></h3>
                      <span className="text-xs text-muted-foreground">
                        {category.currentValue} / {category.nextThreshold || 'Max'}
                      </span>
                    </div>
                    
                    <Progress value={progress} className="h-1" />
                    
                    <div className="flex flex-wrap gap-2 pt-2">
                      {category.badges.map((badge) => (
                        <BadgeDisplay
                          key={badge.id}
                          badge={badge}
                          size="sm"
                          showStage={true}
                        />
                      ))}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BadgesDialog; 
