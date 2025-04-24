
import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

interface ScrollPosition {
  categoryId: string;
  sultanGroup?: string;
  scrollY: number;
  timestamp: number;
}

export const useScrollRestoration = (
  countryId: string,
  isLoading: boolean,
  showSultanGroups: boolean
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Save scroll position when component unmounts or when navigating away
  useEffect(() => {
    const saveScrollPosition = debounce(() => {
      if (!containerRef.current) return;

      const scrollData: ScrollPosition = {
        categoryId: '', // Will be updated by intersection observer
        sultanGroup: showSultanGroups ? '' : undefined, // Will be updated by intersection observer
        scrollY: window.scrollY,
        timestamp: Date.now()
      };

      sessionStorage.setItem(`scroll-${countryId}`, JSON.stringify(scrollData));
    }, 100);

    window.addEventListener('scroll', saveScrollPosition);
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
      saveScrollPosition.cancel();
    };
  }, [countryId, showSultanGroups]);

  // Restore scroll position when content is loaded
  useEffect(() => {
    if (isLoading || restoredRef.current || !containerRef.current) return;

    const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
    if (!savedScrollData) return;

    try {
      const { scrollY } = JSON.parse(savedScrollData) as ScrollPosition;

      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        restoredRef.current = true;
      });
    } catch (error) {
      console.error('Error restoring scroll position:', error);
    }
  }, [countryId, isLoading]);

  return containerRef;
};
