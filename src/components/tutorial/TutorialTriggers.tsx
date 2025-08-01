import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';

export const TutorialTriggers = () => {
  const location = useLocation();
  const { showTutorial } = useTutorial();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;

    // Trigger tutorials based on path
    if (path === '/catalog') {
      showTutorial('firstCatalogueVisit');
    } else if (path === '/collection' || path.startsWith('/collection/')) {
      showTutorial('firstCollectionVisit');
    }
  }, [location.pathname, user, showTutorial]);

  return null; // This component doesn't render anything
};