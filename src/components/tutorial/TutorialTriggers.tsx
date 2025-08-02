import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';

export const TutorialTriggers = () => {
  const { showGuide, isNewUser, completedGuides } = useTutorial();
  const { user } = useAuth();

  // Expose trigger functions globally for external triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerEditGuide = () => {
        if (!completedGuides.has('editBanknote') && user) {
          setTimeout(() => showGuide('editBanknote'), 1000);
        }
      };
      
      (window as any).triggerSuggestGuide = () => {
        if (!completedGuides.has('suggestPicture') && user) {
          setTimeout(() => showGuide('suggestPicture'), 1000);
        }
      };
    }
  }, [user, showGuide, completedGuides]);

  return null; // This component doesn't render anything
};