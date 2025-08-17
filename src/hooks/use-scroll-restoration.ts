
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
  const lastSaveTime = useRef<number>(0);
  const restorationAttempts = useRef(0);
  const maxRestorationAttempts = 4;
  const isRestoringRef = useRef(false);
  const initialScrollSet = useRef(false);
  const debugLogs = useRef<string[]>([]);

  // Debug logging function
  const debugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ` | Data: ${JSON.stringify(data)}` : ''}`;
    debugLogs.current.push(logEntry);
    
    // Keep only last 50 logs
    if (debugLogs.current.length > 50) {
      debugLogs.current = debugLogs.current.slice(-50);
    }
    
    if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
      console.log(`[ScrollRestoration-Jordan] ${message}`, data);
    }
    
    // Log for all countries in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ScrollRestoration-${countryId}] ${message}`, data);
    }
  };

  // Save scroll position when component unmounts or when navigating away
  useEffect(() => {
    const saveScrollPosition = debounce(() => {
      if (!containerRef.current) return;

      const currentTime = Date.now();
      // Prevent excessive saving (max once every 200ms for faster response)
      if (currentTime - lastSaveTime.current < 200) return;
      
      lastSaveTime.current = currentTime;

      const scrollData: ScrollPosition = {
        categoryId: '', // Will be updated by intersection observer
        sultanGroup: showSultanGroups ? '' : undefined, // Will be updated by intersection observer
        scrollY: window.scrollY,
        timestamp: currentTime
      };

      debugLog('Saving scroll position', {
        scrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight
      });

      sessionStorage.setItem(`scroll-${countryId}`, JSON.stringify(scrollData));
    }, 100);

    window.addEventListener('scroll', saveScrollPosition);
    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
      saveScrollPosition.cancel();
    };
  }, [countryId, showSultanGroups]);

  // Immediate scroll position setting to prevent top rendering
  useEffect(() => {
    if (isLoading || initialScrollSet.current) return;

    const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
    if (savedScrollData) {
      try {
        const { scrollY, timestamp } = JSON.parse(savedScrollData) as ScrollPosition;
        
        // Check if scroll data is still relevant (within last 10 minutes)
        const isRelevant = Date.now() - timestamp < 10 * 60 * 1000;
        
        if (isRelevant && scrollY > 0) {
          debugLog('Found saved scroll position, but waiting for content to load before setting', {
            targetScrollY: scrollY,
            currentScrollY: window.scrollY,
            documentHeight: document.documentElement.scrollHeight,
            windowHeight: window.innerHeight,
            maxScrollY: document.documentElement.scrollHeight - window.innerHeight
          });
          
          // Don't set initial scroll position here - wait for content to be loaded
          // This prevents the scroll position from being clamped to a low value
          // due to insufficient content height
        }
      } catch (error) {
        console.error('Error checking saved scroll data:', error);
      }
    }
  }, [isLoading, countryId]);

  // Restore scroll position when content is loaded
  useEffect(() => {
    if (isLoading || restoredRef.current || !containerRef.current) return;

    const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
    if (!savedScrollData) {
      debugLog('No saved scroll data found');
      return;
    }

    try {
      const { scrollY, timestamp } = JSON.parse(savedScrollData) as ScrollPosition;
      
      // Check if scroll data is still relevant (within last 10 minutes)
      const isRelevant = Date.now() - timestamp < 10 * 60 * 1000;
      
      if (!isRelevant) {
        debugLog('Scroll data is stale, clearing', {
          age: Date.now() - timestamp,
          maxAge: 10 * 60 * 1000
        });
        sessionStorage.removeItem(`scroll-${countryId}`);
        return;
      }

      debugLog('Starting scroll restoration', {
        targetScrollY: scrollY,
        currentScrollY: window.scrollY,
        documentHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        maxScrollY: document.documentElement.scrollHeight - window.innerHeight
      });

      // Set restoration flag to prevent scroll events
      isRestoringRef.current = true;

      // Ultra-fast scroll restoration with immediate attempt
      const attemptScrollRestoration = (attemptNumber: number) => {
        // Wait for content to be fully rendered and check if target position is reachable
        const waitForContent = () => {
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const maxScrollY = documentHeight - windowHeight;
          
          // Ensure we don't scroll beyond available content
          const targetScrollY = Math.min(scrollY, maxScrollY);
          
          debugLog(`Scroll restoration attempt ${attemptNumber}`, {
            documentHeight,
            targetScrollY: scrollY,
            adjustedTargetScrollY: targetScrollY,
            maxScrollY,
            currentScrollY: window.scrollY,
            windowHeight
          });

          // Check if we have enough content height to reach the target position
          // Use a larger buffer to ensure we have enough content for accurate scroll restoration
          const requiredHeight = targetScrollY + windowHeight * 1.2;
          
          if (documentHeight < requiredHeight) {
            debugLog(`Not enough content height for scroll restoration`, {
              documentHeight,
              requiredHeight,
              targetScrollY,
              windowHeight,
              buffer: windowHeight * 1.2
            });
            
            // If we haven't exceeded max attempts, retry after a very short delay
            if (attemptNumber < maxRestorationAttempts) {
              setTimeout(() => {
                attemptScrollRestoration(attemptNumber + 1);
              }, 200); // Very short delay for fast restoration
            } else {
              debugLog(`Max attempts reached, scrolling to available position`, {
                maxScrollY,
                targetScrollY: scrollY
              });
              // Scroll to the maximum available position
              window.scrollTo({ top: maxScrollY, behavior: 'instant' });
              restoredRef.current = true;
              isRestoringRef.current = false; // Clear restoration flag
            }
            return;
          }

          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            debugLog(`Setting scroll position via requestAnimationFrame`, {
              targetScrollY,
              currentScrollY: window.scrollY,
              documentHeight,
              maxScrollY
            });
            
            // Set scroll position immediately without animation
            window.scrollTo({ top: targetScrollY, behavior: 'instant' });
            
            // Also set it on document elements as backup
            if (document.documentElement) {
              document.documentElement.scrollTop = targetScrollY;
            }
            if (document.body) {
              document.body.scrollTop = targetScrollY;
            }
            
            // Verify the scroll position was set correctly after a very short delay
            setTimeout(() => {
              const actualScrollY = window.scrollY;
              const scrollDifference = Math.abs(actualScrollY - targetScrollY);
              
              debugLog(`Scroll restoration verification`, {
                attemptNumber,
                targetScrollY,
                actualScrollY,
                scrollDifference,
                success: scrollDifference < 100
              });
              
              // If scroll position is significantly off and we haven't exceeded max attempts, retry
              if (scrollDifference > 100 && attemptNumber < maxRestorationAttempts) {
                debugLog(`Scroll position off by ${scrollDifference}px, retrying`, {
                  attemptNumber,
                  maxAttempts: maxRestorationAttempts
                });
                
                setTimeout(() => {
                  attemptScrollRestoration(attemptNumber + 1);
                }, 100); // Very fast retry
              } else {
                restoredRef.current = true;
                isRestoringRef.current = false; // Clear restoration flag
                initialScrollSet.current = true; // Mark initial scroll as set
                debugLog(`Scroll restoration completed`, {
                  attemptNumber,
                  finalScrollY: actualScrollY,
                  targetScrollY,
                  difference: scrollDifference,
                  success: scrollDifference < 100
                });
              }
            }, 25); // Ultra-fast verification
          });
        };

        // Ultra-fast initial delay - almost immediate for first attempt
        const initialDelay = attemptNumber === 1 ? 50 : 100; // 50ms for first attempt, 100ms for retries
        setTimeout(waitForContent, initialDelay);
      };

      // Start the restoration process
      attemptScrollRestoration(1);
      
    } catch (error) {
      console.error('Error restoring scroll position:', error);
      // Clear corrupted data
      sessionStorage.removeItem(`scroll-${countryId}`);
      isRestoringRef.current = false; // Clear restoration flag on error
    }
  }, [countryId, isLoading]);

  // Reset restoration flag when country changes
  useEffect(() => {
    debugLog('Country changed, resetting scroll restoration state', {
      countryId,
      previousRestored: restoredRef.current,
      previousInitialScrollSet: initialScrollSet.current
    });
    
    restoredRef.current = false;
    lastSaveTime.current = 0;
    restorationAttempts.current = 0;
    isRestoringRef.current = false;
    initialScrollSet.current = false;
    debugLogs.current = [];
  }, [countryId]);

  // Debug function to get all logs
  const getDebugLogs = () => {
    return [...debugLogs.current];
  };

  // Expose debug function for troubleshooting
  if (containerRef.current) {
    (containerRef.current as any).getScrollRestorationLogs = getDebugLogs;
  }

  return containerRef;
};
