import React from 'react';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/context/TutorialContext';
import { HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialButtonProps {
  guide: 'addBanknote' | 'editBanknote' | 'suggestPicture';
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showSparkle?: boolean;
  children?: React.ReactNode;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({ 
  guide, 
  className = '',
  variant = 'ghost',
  size = 'default',
  showSparkle = false,
  children
}) => {
  const { showGuide, isNewUser } = useTutorial();

  const handleClick = () => {
    showGuide(guide);
  };

  // Only show sparkle for new users
  const shouldShowSparkle = showSparkle && isNewUser;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "relative group transition-all duration-200",
        shouldShowSparkle && "animate-pulse",
        className
      )}
      title="Show help"
    >
      {children || <HelpCircle className="h-4 w-4" />}
      
      {/* Sparkle effect for new users */}
      {shouldShowSparkle && (
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-3 w-3 text-gold-500 animate-bounce" />
        </div>
      )}
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-ottoman-500/10 to-gold-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </Button>
  );
};