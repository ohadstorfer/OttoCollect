import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook that automatically scrolls to the top of the page
 * whenever the route changes. This ensures users always start at the top
 * when navigating to a new page.
 * 
 * Uses both modern smooth scrolling and fallback for better browser compatibility.
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Immediate scroll to top for instant feedback
    window.scrollTo(0, 0);
    
    // Additional smooth scroll after a brief delay for better UX
    const timer = setTimeout(() => {
      try {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } catch (error) {
        // Fallback for browsers that don't support smooth scrolling
        window.scrollTo(0, 0);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);
} 