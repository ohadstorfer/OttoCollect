import React from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TutorialProgress: React.FC = () => {
  const { isNewUser, completedSteps, resetTutorial } = useTutorial();

  if (!isNewUser) return null;

  const tutorialSteps = [
    'welcome',
    'firstCatalogueVisit',
    'firstCollectionVisit',
    'firstEditClick',
    'firstMarketplaceVisit',
    'firstForumVisit'
  ];

  const completedCount = tutorialSteps.filter(step => completedSteps.has(step as any)).length;
  const progress = (completedCount / tutorialSteps.length) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4 w-64">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold">Getting Started</h3>
          <div className="ml-auto">
            <span className="text-xs text-muted-foreground">
              {completedCount}/{tutorialSteps.length}
            </span>
          </div>
        </div>
        
        <Progress value={progress} className="mb-3" />
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {progress === 100 ? 'All done! 🎉' : `${Math.round(progress)}% complete`}
          </span>
          
          {progress === 100 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTutorial}
              className="text-xs"
            >
              Restart
            </Button>
          )}
        </div>
        
        {/* Step indicators */}
        <div className="flex gap-1 mt-2">
          {tutorialSteps.map((step, index) => (
            <div
              key={step}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                completedSteps.has(step as any)
                  ? "bg-green-500"
                  : "bg-gray-300"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 