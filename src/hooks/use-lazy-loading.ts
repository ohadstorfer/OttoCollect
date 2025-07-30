import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadingProps<T> {
  items: T[];
  initialLoadCount?: number;
  loadIncrement?: number;
  threshold?: number;
}

interface UseLazyLoadingReturn<T> {
  visibleItems: T[];
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  resetPagination: () => void;
}

export function useLazyLoading<T>({
  items,
  initialLoadCount = 20,
  loadIncrement = 20,
  threshold = 0.8
}: UseLazyLoadingProps<T>): UseLazyLoadingReturn<T> {
  const [loadedCount, setLoadedCount] = useState(initialLoadCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate visible items
  const visibleItems = items.slice(0, loadedCount);
  const hasMore = loadedCount < items.length;

  // Load more items
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    loadingTimeoutRef.current = setTimeout(() => {
      setLoadedCount(prev => Math.min(prev + loadIncrement, items.length));
      setIsLoadingMore(false);
    }, 100);
  }, [isLoadingMore, hasMore, loadIncrement, items.length]);

  // Reset pagination when items change
  const resetPagination = useCallback(() => {
    setLoadedCount(Math.min(initialLoadCount, items.length));
    setIsLoadingMore(false);
  }, [initialLoadCount, items.length]);

  // Reset when items array changes
  useEffect(() => {
    resetPagination();
  }, [items, resetPagination]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleItems,
    isLoadingMore,
    hasMore,
    loadMore,
    resetPagination
  };
}

// Hook for infinite scroll detection
export function useInfiniteScroll(
  loadMore: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold = 0.8
) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !hasMore || isLoading) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      const scrollPercentage = (scrollTop + windowHeight) / documentHeight;

      if (scrollPercentage >= threshold) {
        loadMore();
      }
    };

    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll);

    return () => window.removeEventListener('scroll', throttledScroll);
  }, [loadMore, hasMore, isLoading, threshold, isMounted]);
}

// Simple throttle function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}