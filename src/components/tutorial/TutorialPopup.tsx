import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '@/context/TutorialContext';
import { useTheme } from '@/context/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TutorialPopup = () => {
  const { t } = useTranslation('guide');
  const { theme } = useTheme();
  const { 
    tutorialState, 
    nextStep, 
    previousStep, 
    completeTutorial, 
    hideTutorial, 
    skipTutorial 
  } = useTutorial();

  if (!tutorialState.isVisible || !tutorialState.currentGuide) {
    return null;
  }

  const { currentGuide, currentStep, totalSteps } = tutorialState;
  
  // Get content from guide.json sections
  const sectionContent = t(`sections.${currentGuide}`, { returnObjects: true }) as any;
  const stepKey = `step${currentStep}`;
  const stepContent = sectionContent?.steps?.[stepKey];
  
  if (!stepContent) {
    return null;
  }

  const progress = (currentStep / totalSteps) * 100;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  
  // For the first step of addBanknote, show welcome message
  const isWelcomeStep = currentGuide === 'addBanknote' && isFirstStep;

  // Guide configurations
  const guideConfigs = {
    addBanknote: { 
      icon: '🧾', 
      color: theme === 'light' ? 'bg-gradient-to-r from-ottoman-300 to-ottoman-500' : 'bg-gradient-to-r from-ottoman-600 via-gold-600 to-ottoman-700',
      name: 'How to Add a Banknote to Your Collection'
    },
    editBanknote: { 
      icon: '✏️', 
      color: theme === 'light' ? 'bg-gradient-to-r from-ottoman-300 to-ottoman-500' : 'bg-gradient-to-r from-ottoman-600 via-gold-600 to-ottoman-700',
      name: 'How to Add Information or a Picture to a Banknote in Your Collection'
    },
    suggestPicture: { 
      icon: '🖼️', 
      color: theme === 'light' ? 'bg-gradient-to-r from-ottoman-300 to-ottoman-500' : 'bg-gradient-to-r from-ottoman-600 via-gold-600 to-ottoman-700',
      name: 'How to Suggest a Picture from Your Collection to the Main Catalogues'
    }
  };

  const currentGuideConfig = guideConfigs[currentGuide];

  return (
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
          <div className={cn("p-4 text-white relative", currentGuideConfig.color)}>
            <div className="flex items-center gap-3">
              <div className="text-2xl animate-pulse">
                {currentGuideConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                {/* Welcome message - only for first step of addBanknote */}
                {isWelcomeStep && (
                  <h2 className="text-xl font-bold mb-2 leading-tight">
                    <span>Welcome to OttoCollect! 🎉</span>
                  </h2>
                )}
                
                {/* Guide name - always visible */}
                <h3 className={cn(
                  "font-semibold leading-tight",
                  isWelcomeStep ? "text-base text-white/90" : "text-lg text-white"
                )}>
                 <span>{currentGuideConfig.name}</span>
                </h3>
                
                {/* Step counter and current step title */}
                <div className="mt-2 space-y-1">
                  <p className="text-white/80 text-xs font-medium">
                    Step {currentStep} of {totalSteps}
                  </p>

                </div>
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
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-shrink-0 w-8 h-8 bg-ottoman-100 rounded-full flex items-center justify-center">
                <HelpCircle className="h-4 w-4 text-ottoman-600" />
              </div>
              <div className="flex-1">
              <h4 className={cn(
                    "font-bold leading-tight",
                    isWelcomeStep ? "text-base text-white/90" : "text-lg text-white"
                  )}>
                    <span>{stepContent.title}</span>
                  </h4>
                {isWelcomeStep && (
                  <p className="text-muted-foreground mb-3 text-sm">
                    Let's get you started with your banknote collection journey
                  </p>
                )}
                <p className="text-foreground leading-relaxed text-base font-medium">
  {stepContent.description}
</p>
                {stepContent.type === 'error' && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-3">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Important Note
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    className="text-sm flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={skipTutorial}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Skip Guide
                </Button>
              </div>
              
              {isLastStep ? (
                <Button
                  onClick={completeTutorial}
                  className="text-sm flex items-center gap-2 bg-gradient-to-r from-ottoman-600  to-ottoman-700 hover:from-ottoman-700  hover:to-ottoman-800 text-white"
                >
                  Complete Guide ✓
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  className="text-sm flex items-center gap-2 bg-gradient-to-r from-ottoman-500  to-ottoman-600 hover:from-ottoman-600  hover:to-ottoman-700 text-white"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Step indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalSteps }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    index < currentStep 
                      ? "bg-ottoman-600" 
                      : "bg-gray-300"
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};