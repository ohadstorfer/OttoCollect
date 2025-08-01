import React from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/context/TutorialContext';
import { HelpCircle } from 'lucide-react';

interface TutorialButtonProps {
  step: 'firstEditClick';
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({ 
  step, 
  className = '',
  variant = 'ghost'
}) => {
  const { showTutorial } = useTutorial();

  const handleClick = () => {
    showTutorial(step);
  };

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleClick}
      className={className}
      title="Show help"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
};