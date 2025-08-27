import React from 'react';
import { useTutorial } from '@/context/TutorialContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TutorialHighlightProps {
  guide: 'addBanknote' | 'editBanknote' | 'suggestPicture';
  step?: number;
  children: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

export const TutorialHighlight: React.FC<TutorialHighlightProps> = ({
  guide,
  step = 1,
  children,
  className = '',
  highlight = false
}) => {
  const { tutorialState } = useTutorial();
  const { t } = useTranslation('guide');
  
  const isHighlighted = highlight && 
    tutorialState.isVisible && 
    tutorialState.currentGuide === guide && 
    (!step || tutorialState.currentStep === step);

  return (
    <div
      className={cn(
        "relative transition-all duration-300",
        isHighlighted && "z-40",
        className
      )}
    >
      {children}
      
      {/* Highlight overlay */}
      {isHighlighted && (
        <>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-ottoman-500/20 rounded-lg animate-pulse" />
          
          {/* Border highlight */}
          <div className="absolute inset-0 border-2 border-ottoman-600 rounded-lg animate-ping" />
          
          {/* Arrow indicator */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-ottoman-600 text-white px-2 py-1 rounded text-xs font-medium animate-bounce">
              {t('highlight.clickHere', 'Click here!')}
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-ottoman-600 mx-auto" />
          </div>
        </>
      )}
    </div>
  );
}; 