
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { BadgeDisplay, BadgeInfo } from './BadgeDisplay';
import { BadgeCategory } from '@/services/badgeService';
import { Card } from "@/components/ui/card";
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/context/LanguageContext';
import { getLocalizedText } from '@/utils/localizationUtils';

interface BadgesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBadges: BadgeInfo[];
  badgeCategories: BadgeCategory[];
  isLoading?: boolean;
}

// Ghost badge skeleton component
const GhostBadge = () => (
  <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse">
    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-300 dark:bg-gray-600"></div>
    <div className="w-12 h-2.5 sm:w-16 sm:h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
  </div>
);

// Ghost category card skeleton
const GhostCategoryCard = () => (
  <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
    <div className="flex items-center justify-between mb-2">
      <div className="w-20 h-3 sm:w-24 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div className="w-12 h-2.5 sm:w-16 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
    
    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    
    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
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
  const isMobile = useIsMobile(); // Mobile detection hook
  const { t } = useTranslation(['badges']);
  const { currentLanguage, direction } = useLanguage();

  const content = (
    <ScrollArea className="flex-1 px-1">
      <div 
        className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-1"
        dir={direction}
      >
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
                             <Card key={category.name} className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                 <div className="flex items-center justify-between mb-2">
                   <h3 className={`text-sm sm:text-base font-medium ${direction === 'rtl' ? 'text-right' : ''}`}>
                     <span>
                       {getLocalizedText(
                         category.name,
                         currentLanguage === 'ar' ? category.name_ar : category.name_tr,
                         currentLanguage
                       )}
                     </span>
                   </h3>
                   <span className={`text-xs text-muted-foreground ${direction === 'rtl' ? 'text-right' : ''}`}>
                     {category.currentValue} / {category.nextThreshold || t('progress.max', { defaultValue: 'Max' })}
                   </span>
                 </div>
                
                <Progress value={progress} className="h-1 sm:h-1.5" />
                
                <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                  {category.badges.length > 0 ? (
                    category.badges.map((badge) => (
                      <BadgeDisplay
                        key={badge.id}
                        badge={badge}
                        size="sm"
                        showStage={true}
                      />
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground py-2">
                      {t('status.noBadgesEarned', { defaultValue: 'No badges earned yet' })}
                    </span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader className="px-4 py-3 border-b flex-shrink-0">
            <DrawerTitle className={`text-lg font-semibold text-center ${direction === 'rtl' ? 'text-right' : ''}`}>
              <span>{t('dialog.title', { defaultValue: 'Achievements' })}</span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-4 pb-6">
              <div 
                className="grid grid-cols-1 gap-3 py-4"
                dir={direction}
              >
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
                      <Card key={category.name} className="p-3 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-sm font-medium ${direction === 'rtl' ? 'text-right' : ''}`}>
                            <span>
                              {getLocalizedText(
                                category.name,
                                currentLanguage === 'ar' ? category.name_ar : category.name_tr,
                                currentLanguage
                              )}
                            </span>
                          </h3>
                          <span className={`text-xs text-muted-foreground ${direction === 'rtl' ? 'text-right' : ''}`}>
                            {category.currentValue} / {category.nextThreshold || t('progress.max', { defaultValue: 'Max' })}
                          </span>
                        </div>
                        
                        <Progress value={progress} className="h-1" />
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {category.badges.length > 0 ? (
                            category.badges.map((badge) => (
                              <BadgeDisplay
                                key={badge.id}
                                badge={badge}
                                size="sm"
                                showStage={true}
                              />
                            ))
                          ) : (
                            <span className={`text-xs text-muted-foreground py-2 ${direction === 'rtl' ? 'text-right' : ''}`}>
                              {t('status.noBadgesEarned', { defaultValue: 'No badges earned yet' })}
                            </span>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className={`text-xl font-semibold ${direction === 'rtl' ? 'text-right' : ''}`}>
            <span>{t('dialog.title', { defaultValue: 'Achievements' })}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgesDialog; 
