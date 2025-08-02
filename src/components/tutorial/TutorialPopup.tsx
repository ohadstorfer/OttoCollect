import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '@/context/TutorialContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TutorialPopup = () => {
  const { t } = useTranslation('guide');
  const { currentStep, isVisible, completeTutorial, hideTutorial, resetTutorial } = useTutorial();

  if (!currentStep || !isVisible) return null;

  const tutorial = t(`tutorials.${currentStep}`, { returnObjects: true }) as {
    title: string;
    description: string;
    action?: string;
    skipText?: string;
  };

  // Tutorial steps configuration
  const tutorialSteps = [
    { key: 'welcome', icon: '🎉', color: 'bg-gradient-to-r from-blue-500 to-purple-500' },
    { key: 'firstCatalogueVisit', icon: '📚', color: 'bg-gradient-to-r from-green-500 to-blue-500' },
    { key: 'firstCollectionVisit', icon: '💼', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
    { key: 'firstEditClick', icon: '✏️', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  ];

  const currentStepIndex = tutorialSteps.findIndex(step => step.key === currentStep);
  const currentStepConfig = tutorialSteps[currentStepIndex];

  return (
    <>
      {isVisible && (
        <>
          {/* Enhanced Backdrop with blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
            onClick={hideTutorial}
          />
          
          {/* Enhanced Popup */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Header with gradient */}
              <div className={cn("p-4 text-white relative", currentStepConfig?.color)}>
                <div className="flex items-center gap-3">
                  <div className="text-2xl animate-pulse">
                    {currentStepConfig?.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">
                      {tutorial.title}
                    </h3>
                    <p className="text-white/90 text-sm mt-1">
                      Step {currentStepIndex + 1} of {tutorialSteps.length}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={hideTutorial}
                    className="h-8 w-8 hover:bg-white/20 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Progress bar */}
                <div className="mt-3 bg-white/20 rounded-full h-1">
                  <div 
                    className="bg-white h-1 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStepIndex + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {tutorial.description}
                  </p>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={hideTutorial}
                      className="text-sm"
                    >
                      {tutorial.skipText || 'Skip Tutorial'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={resetTutorial}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Restart
                    </Button>
                  </div>
                  
                  <Button
                    onClick={completeTutorial}
                    className="text-sm flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    {tutorial.action || 'Got it!'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Step indicators */}
                <div className="flex justify-center gap-2 mt-4">
                  {tutorialSteps.map((step, index) => (
                    <div
                      key={step.key}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        index <= currentStepIndex 
                          ? "bg-blue-500" 
                          : "bg-gray-300"
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
};