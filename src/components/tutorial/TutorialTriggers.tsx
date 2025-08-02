import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';

export const TutorialTriggers = () => {
  const location = useLocation();
  const { showTutorial, isNewUser, hasSeenWelcome } = useTutorial();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isNewUser) return;

    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // Only show tutorials if user has seen welcome
    if (!hasSeenWelcome) return;

    // Trigger tutorials based on path with delays for better UX
    const triggerTutorial = (step: string, delay: number = 1000) => {
      setTimeout(() => {
        showTutorial(step as any);
      }, delay);
    };

    // Catalogue tutorials
    if (path === '/catalog') {
      triggerTutorial('firstCatalogueVisit', 1500);
    } else if (path.startsWith('/catalog/')) {
      // User clicked on a specific country
      triggerTutorial('firstCatalogueVisit', 2000);
    }
    
    // Collection tutorials
    else if (path === '/collection' || path.startsWith('/collection/')) {
      triggerTutorial('firstCollectionVisit', 1500);
    }
    
    // Profile/Collection management
    else if (path.startsWith('/profile/')) {
      triggerTutorial('firstCollectionVisit', 1500);
    }
    
    // Marketplace tutorials
    else if (path === '/marketplace') {
      triggerTutorial('firstMarketplaceVisit', 1500);
    }
    
    // Forum tutorials
    else if (path === '/community/forum' || path.startsWith('/community/forum')) {
      triggerTutorial('firstForumVisit', 1500);
    }
    
    // Blog tutorials
    else if (path === '/blog') {
      triggerTutorial('firstForumVisit', 1500);
    }

  }, [location.pathname, user, showTutorial, isNewUser, hasSeenWelcome]);

  return null; // This component doesn't render anything
};