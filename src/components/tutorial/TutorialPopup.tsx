import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '@/context/TutorialContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

export const TutorialPopup = () => {
  const { t } = useTranslation('guide');
  const { currentStep, isVisible, completeTutorial, hideTutorial } = useTutorial();

  if (!currentStep || !isVisible) return null;

  const tutorial = t(`tutorials.${currentStep}`, { returnObjects: true }) as {
    title: string;
    description: string;
  };

  return (
    <>
      {isVisible && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
            onClick={hideTutorial}
          />
          
          {/* Popup */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="shadow-2xl border-2 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {tutorial.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={hideTutorial}
                    className="h-8 w-8 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {tutorial.description}
                </p>
                
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={hideTutorial}
                    className="text-sm"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={completeTutorial}
                    className="text-sm flex items-center gap-2"
                  >
                    Got it
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
};