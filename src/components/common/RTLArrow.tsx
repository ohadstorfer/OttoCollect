import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface RTLArrowProps {
  direction: 'left' | 'right';
  variant?: 'arrow' | 'chevron';
  className?: string;
}

export const RTLArrow: React.FC<RTLArrowProps> = ({ 
  direction, 
  variant = 'arrow', 
  className = '' 
}) => {
  const { direction: langDirection } = useLanguage();
  
  // In RTL, reverse the direction
  const actualDirection = langDirection === 'rtl' 
    ? (direction === 'left' ? 'right' : 'left')
    : direction;

  if (variant === 'chevron') {
    return actualDirection === 'left' 
      ? <ChevronLeft className={className} />
      : <ChevronRight className={className} />;
  }

  return actualDirection === 'left' 
    ? <ArrowLeft className={className} />
    : <ArrowRight className={className} />;
};