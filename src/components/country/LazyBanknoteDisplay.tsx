import React, { useMemo } from 'react';
import { DetailedBanknote, CollectionItem } from '@/types';
import { useLazyLoading, useInfiniteScroll } from '@/hooks/use-lazy-loading';
import { BanknoteGroups } from '@/components/banknotes/BanknoteGroups';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

interface LazyBanknoteDisplayProps {
  groups: {
    category: string;
    items: DetailedBanknote[];
    sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
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
    initialLoadCount: 5, // Load 5 groups initially
    loadIncrement: 3, // Load 3 more groups at a time
  });

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
    <div className="space-y-6">
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

      {/* No more items indicator */}
      {!hasMore && visibleItems.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          All banknotes loaded
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