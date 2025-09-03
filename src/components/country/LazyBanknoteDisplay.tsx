import React, { useMemo, useEffect, useRef } from 'react';
import { DetailedBanknote, CollectionItem } from '@/types';
import { useLazyLoading, useInfiniteScroll } from '@/hooks/use-lazy-loading';
import { BanknoteGroups } from '@/components/banknotes/BanknoteGroups';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';

interface LazyBanknoteDisplayProps {
  groups: {
    category: string;
    items: DetailedBanknote[];
    sultanGroups?: { 
      sultan: string; 
      sultan_ar?: string; 
      sultan_tr?: string; 
      items: DetailedBanknote[] 
    }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading: boolean;
  groupMode: boolean;
  userCollection?: CollectionItem[];
}

const LazyBanknoteDisplay: React.FC<LazyBanknoteDisplayProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading,
  groupMode,
  userCollection = []
}) => {
  // Add scroll restoration for this country
  const containerRef = useScrollRestoration(countryId, isLoading, showSultanGroups);
  
  // Track if scroll restoration has completed
  const scrollRestorationCompleted = useRef(false);
  const paginationResetAttempted = useRef(false);
  const contentFullyLoaded = useRef(false);
  const scrollRestorationInProgress = useRef(false);

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
    initialLoadCount: 8, // Increased from 5 to 8 groups initially for better scroll restoration
    loadIncrement: 4, // Increased from 3 to 4 groups at a time
  });

  // Check if we need to load more content for scroll restoration
  useEffect(() => {
    if (!isLoading && !scrollRestorationInProgress.current && groups.length > 0) {
      const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
      if (savedScrollData) {
        try {
          const { scrollY } = JSON.parse(savedScrollData);
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const requiredHeight = scrollY + windowHeight * 0.8; // Minimal buffer for ultra-fast restoration
          
          // If we don't have enough content height and there are more groups to load
          if (documentHeight < requiredHeight && hasMore && visibleItems.length < groups.length) {
            if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
              console.log(`[LazyBanknoteDisplay] Need more content for scroll restoration. Current height: ${documentHeight}, Required: ${requiredHeight}, Loading more...`);
            }
            
            // Load more content to reach the target scroll position
            const groupsToLoad = Math.ceil((requiredHeight - documentHeight) / 200); // Estimate 200px per group
            const loadCount = Math.min(groupsToLoad, groups.length - visibleItems.length);
            
            if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
              console.log(`[LazyBanknoteDisplay] Loading ${loadCount} more groups for scroll restoration`);
            }
            
            // Load more groups multiple times if needed - ultra-fast loading
            const loadMoreGroups = (remaining: number) => {
              if (remaining > 0 && hasMore) {
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
        
        // Check if we have enough content height (at least 2x window height)
        if (documentHeight >= windowHeight * 2) {
          contentFullyLoaded.current = true;
          if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
            console.log(`[LazyBanknoteDisplay] Content fully loaded for Jordan, height: ${documentHeight}, groups: ${groups.length}`);
          }
        } else {
          // If not enough height, check again in ultra-fast intervals
          setTimeout(checkContentHeight, 50); // Ultra-fast 50ms intervals
        }
      };
      
      // Start checking almost immediately
      setTimeout(checkContentHeight, 100); // Ultra-fast 100ms start
    }
  }, [isLoading, groups.length, countryId]);

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
          
          if (isRecent) {
            console.log(`[LazyBanknoteDisplay] Preserving pagination for ${countryId} due to recent scroll position`);
            paginationResetAttempted.current = true;
            return;
          }
        } catch (error) {
          console.error('Error parsing scroll data:', error);
        }
      }
      
      // Reset pagination only if no recent scroll position or if it's stale
      console.log(`[LazyBanknoteDisplay] Resetting pagination for ${countryId}`);
      resetPagination();
      paginationResetAttempted.current = true;
    }
  }, [isLoading, countryId, resetPagination, contentFullyLoaded.current]);

  // Reset pagination reset flag when country changes
  useEffect(() => {
    paginationResetAttempted.current = false;
    scrollRestorationCompleted.current = false;
    contentFullyLoaded.current = false;
    scrollRestorationInProgress.current = false;
  }, [countryId]);

  // Debug function for Jordan specifically
  const debugScrollRestoration = () => {
    if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
      
      
      const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
      if (savedScrollData) {
        try {
          const parsedData = JSON.parse(savedScrollData);
        } catch (error) {
          console.error(`- Error parsing saved scroll data:`, error);
        }
      } else {
        console.log(`- No saved scroll data found`);
      }
    }
  };

  // Use infinite scroll
  useInfiniteScroll(loadMore, hasMore, isLoadingMore || isLoading);

  if (isLoading && visibleItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
        <span className="ml-2 text-muted-foreground">Loading banknotes...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <BanknoteGroups
        groups={visibleItems.map(({ group }) => group)}
        showSultanGroups={showSultanGroups}
        viewMode={viewMode}
        countryId={countryId}
        isLoading={isLoading}
        groupMode={groupMode}
        userCollection={userCollection}
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

      {/* Empty state */}
      {!isLoading && visibleItems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No banknotes found</p>
        </div>
      )}
    </div>
  );
};

export default LazyBanknoteDisplay;