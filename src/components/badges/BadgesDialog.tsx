
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { BadgeDisplay, BadgeInfo } from './BadgeDisplay';
import { BadgeCategory } from '@/services/badgeService';

interface BadgesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBadges: BadgeInfo[];
  badgeCategories: BadgeCategory[];
}

export const BadgesDialog = ({
  open,
  onOpenChange,
  userBadges,
  badgeCategories
}: BadgesDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Achievements & Badges
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {badgeCategories.map((category) => {
              const progress = category.nextThreshold 
                ? (category.currentValue / category.nextThreshold) * 100
                : 100;
                
              return (
                <div key={category.name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {category.currentValue} / {category.nextThreshold || 'Max'}
                    </span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {category.badges.map((badge) => (
                      <BadgeDisplay
                        key={badge.id}
                        badge={badge}
                        showStage
                        size="md"
                        className="w-full justify-start"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default BadgesDialog; 
