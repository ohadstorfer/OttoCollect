import React, { useMemo, useEffect, useRef } from 'react';
import { CollectionItem } from '@/types';
import { useLazyLoading, useInfiniteScroll } from '@/hooks/use-lazy-loading';
import { CollectionItemsGroups } from '@/components/collection/CollectionItemsGroups';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';

interface LazyCollectionDisplayProps {
  groups: {
    category: string;
    items: CollectionItem[];
    sultanGroups?: { sultan: string; items: CollectionItem[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  groupMode: boolean;
  countryId: string; // Add countryId prop for scroll restoration
  onUpdate?: () => Promise<void>;
  isOwner?: boolean;
}

const LazyCollectionDisplay: React.FC<LazyCollectionDisplayProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  isLoading,
  groupMode,
  countryId,
  onUpdate,
  isOwner = false
}) => {
  // Enhanced scroll restoration for collections
  const containerRef = useScrollRestoration(countryId, isLoading, showSultanGroups);
  
  // Debug refs for tracking content loading
  const contentFullyLoaded = useRef(false);
  const paginationResetAttempted = useRef(false);
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
      console.log(`[LazyCollectionDisplay-Jordan] ${message}`, data);
    }
    
    // Log for all countries in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LazyCollectionDisplay-${countryId}] ${message}`, data);
    }
  };

  // Flatten groups for lazy loading
  const flattenedItems = useMemo(() => {
    return groups.map((group, groupIndex) => ({
      group,
      groupIndex,
      type: 'group' as const
    }));
  }, [groups]);

  const {
    visibleItems,
    isLoadingMore,
    hasMore,
    loadMore,
    resetPagination
  } = useLazyLoading({
    items: flattenedItems,
    initialLoadCount: 8, // Increased for faster initial loading
    loadIncrement: 4, // Increased for faster loading
  });

  // Debug content loading state
  useEffect(() => {
    debugLog('Content loading state changed', {
      totalGroups: groups.length,
      visibleGroups: visibleItems.length,
      isLoading,
      isLoadingMore,
      hasMore,
      contentFullyLoaded: contentFullyLoaded.current
    });
  }, [groups.length, visibleItems.length, isLoading, isLoadingMore, hasMore]);

  // Check if we need to load more content for scroll restoration
  useEffect(() => {
    if (!isLoading && !contentFullyLoaded.current && groups.length > 0) {
      const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
      if (savedScrollData) {
        try {
          const { scrollY } = JSON.parse(savedScrollData);
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const requiredHeight = scrollY + windowHeight * 1.2; // Increased buffer for better accuracy
          
          debugLog('Checking if more content needed for scroll restoration', {
            targetScrollY: scrollY,
            currentDocumentHeight: documentHeight,
            requiredHeight,
            windowHeight,
            visibleGroups: visibleItems.length,
            totalGroups: groups.length,
            hasMore
          });
          
          // If we don't have enough content height and there are more groups to load
          if (documentHeight < requiredHeight && hasMore && visibleItems.length < groups.length) {
            debugLog('Need more content for scroll restoration', {
              currentHeight: documentHeight,
              requiredHeight,
              loadingMore: true
            });
            
            // Load more content to reach the target scroll position
            const groupsToLoad = Math.ceil((requiredHeight - documentHeight) / 200); // Estimate 200px per group
            const loadCount = Math.min(groupsToLoad, groups.length - visibleItems.length);
            
            debugLog('Loading more groups for scroll restoration', {
              groupsToLoad,
              loadCount,
              remainingGroups: groups.length - visibleItems.length
            });
            
            // Load more groups multiple times if needed - ultra-fast loading
            const loadMoreGroups = (remaining: number) => {
              if (remaining > 0 && hasMore) {
                debugLog(`Loading group ${visibleItems.length + 1} of ${groups.length}`, {
                  remaining,
                  hasMore
                });
                loadMore();
                setTimeout(() => loadMoreGroups(remaining - 1), 25); // Ultra-fast 25ms intervals
              }
            };
            
            loadMoreGroups(loadCount);
          }
        } catch (error) {
          console.error('Error checking scroll restoration content:', error);
        }
      }
    }
  }, [isLoading, groups.length, visibleItems.length, hasMore, countryId, loadMore]);

  // Track when content is fully loaded
  useEffect(() => {
    if (!isLoading && groups.length > 0 && !contentFullyLoaded.current) {
      // Wait for content to be fully rendered and ensure we have enough height
      const checkContentHeight = () => {
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        
        debugLog('Checking content height', {
          documentHeight,
          windowHeight,
          minRequiredHeight: windowHeight * 3, // Increased from 2x to 3x for better scroll restoration
          hasEnoughHeight: documentHeight >= windowHeight * 3
        });
        
        // Check if we have enough content height (at least 3x window height for better scroll restoration)
        if (documentHeight >= windowHeight * 3) {
          contentFullyLoaded.current = true;
          debugLog('Content fully loaded', {
            documentHeight,
            windowHeight,
            groups: groups.length,
            visibleGroups: visibleItems.length
          });
        } else {
          // If not enough height, check again in ultra-fast intervals
          setTimeout(checkContentHeight, 50); // Ultra-fast 50ms intervals
        }
      };
      
      // Start checking almost immediately
      setTimeout(checkContentHeight, 100); // Ultra-fast 100ms start
    }
  }, [isLoading, groups.length, visibleItems.length, countryId]);

  // Improved pagination reset logic with better scroll restoration coordination
  useEffect(() => {
    if (!isLoading && !paginationResetAttempted.current && contentFullyLoaded.current) {
      // Check if we have a saved scroll position
      const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
      
      if (savedScrollData) {
        try {
          const parsedData = JSON.parse(savedScrollData);
          // If we have recent scroll data (within last 5 minutes), don't reset pagination
          const isRecent = Date.now() - parsedData.timestamp < 5 * 60 * 1000;
          
          debugLog('Checking pagination reset', {
            hasSavedScrollData: true,
            isRecent,
            age: Date.now() - parsedData.timestamp,
            maxAge: 5 * 60 * 1000
          });
          
          if (isRecent) {
            debugLog('Preserving pagination due to recent scroll position');
            paginationResetAttempted.current = true;
            return;
          }
        } catch (error) {
          console.error('Error parsing scroll data:', error);
        }
      }
      
      // Reset pagination only if no recent scroll position or if it's stale
      debugLog('Resetting pagination');
      resetPagination();
      paginationResetAttempted.current = true;
    }
  }, [isLoading, countryId, resetPagination, contentFullyLoaded.current]);

  // Reset flags when country changes
  useEffect(() => {
    debugLog('Country changed, resetting state', {
      countryId,
      previousContentFullyLoaded: contentFullyLoaded.current,
      previousPaginationResetAttempted: paginationResetAttempted.current
    });
    
    paginationResetAttempted.current = false;
    contentFullyLoaded.current = false;
    debugLogs.current = [];
  }, [countryId]);

  // Use infinite scroll
  useInfiniteScroll(loadMore, hasMore, isLoadingMore || isLoading);

  // Debug function to get all logs
  const getDebugLogs = () => {
    return [...debugLogs.current];
  };

  // Expose debug function for troubleshooting
  if (containerRef.current) {
    (containerRef.current as any).getLazyCollectionDebugLogs = getDebugLogs;
  }

  if (isLoading && visibleItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-2 text-muted-foreground">Loading collection...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <CollectionItemsGroups
        groups={visibleItems.map(({ group }) => group)}
        showSultanGroups={showSultanGroups}
        viewMode={viewMode}
        countryId={countryId}
        isLoading={isLoading}
        groupMode={groupMode}
        onUpdate={onUpdate || (() => Promise.resolve())}
        isOwner={isOwner}
      />

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <Spinner />
          <span className="ml-2 text-muted-foreground">Loading more...</span>
        </div>
      )}

      {/* Load more button (fallback for infinite scroll) */}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center py-8">
          <Button 
            onClick={loadMore} 
            variant="outline"
            className="min-w-32"
          >
            Load More
          </Button>
        </div>
      )}

     

    </div>
  );
};

export default LazyCollectionDisplay;