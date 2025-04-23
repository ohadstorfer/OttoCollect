import { useEffect, useRef } from 'react';

export const useScrollPersistence = (key: string, dependencies: any[] = []) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Save scroll position when component unmounts
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        const scrollPosition = containerRef.current.scrollTop;
        localStorage.setItem(key, scrollPosition.toString());
      }
    };
  }, [key]);

  // Restore scroll position after dependencies change and content is loaded
  useEffect(() => {
    if (!containerRef.current || isRestoringScroll.current) return;

    const savedScrollPosition = localStorage.getItem(key);
    if (savedScrollPosition) {
      isRestoringScroll.current = true;
      
      // Use requestAnimationFrame to ensure smooth scrolling after content is rendered
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: parseInt(savedScrollPosition),
            behavior: 'smooth'
          });
          
          // Reset the flag after a short delay to allow the scroll to complete
          setTimeout(() => {
            isRestoringScroll.current = false;
          }, 1000);
        }
      });
    }
  }, [key, ...dependencies]);

  return containerRef;
}; 