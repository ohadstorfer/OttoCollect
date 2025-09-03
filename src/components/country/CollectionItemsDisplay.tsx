import React from "react";
import { CollectionItem } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { CollectionItemsGroups } from "@/components/collection/CollectionItemsGroups";
import { cn } from "@/lib/utils";
import LazyCollectionDisplay from "./LazyCollectionDisplay";

interface CollectionItemsDisplayProps {
  groups: {
    category: string;
    items: CollectionItem[];
    sultanGroups?: { 
      sultan: string; 
      sultan_ar?: string; 
      sultan_tr?: string; 
      items: CollectionItem[] 
    }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading: boolean;
  groupMode: boolean;
  isOwner: boolean;
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  countryName?: string;
  filters?: DynamicFilterState; // Add filters prop
  hasAnyItems?: boolean; // Add hasAnyItems prop
}

export const CollectionItemsDisplay: React.FC<CollectionItemsDisplayProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading,
  groupMode,
  isOwner,
  activeTab,
  countryName,
  filters, // Destructure filters prop
  hasAnyItems, // Destructure hasAnyItems prop
}) => {
  // Debug logging for props
  console.log('CollectionItemsDisplay: Received props:', { viewMode, groupMode, activeTab, groupsCount: groups.length, hasAnyItems });
  
  // Function to update collection items after changes
  const handleUpdate = async () => {
    // In a real implementation, we would call a function from props
    // that refreshes the collection data
    console.log("Collection update requested");
    return Promise.resolve();
  };

  // Check if user is currently searching
  const isSearching = filters?.search && filters.search.trim() !== "";

  return (
    <div className={cn(
      "mt-6 w-full",
      viewMode === 'list' && "px-0"
    )}>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          {activeTab === 'sale' ? (
            <>
              {hasAnyItems === false ? (
                // No items for sale at all
                <>
                  <h3 className="text-xl font-medium mb-4">
                    <span>No banknotes from {countryName || 'this country'} are currently listed for sale.</span>
                  </h3>
                  <p className="text-muted-foreground">
                    {isOwner ? 'To list your banknotes for sale, edit your collection items.' : 'Check back later for new listings.'}
                  </p>
                </>
              ) : isSearching ? (
                // Show search-specific message when user is searching
                <>
                  <h3 className="text-xl font-medium mb-4"><span>No sale items found</span></h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
                </>
              ) : (
                // Show filter guidance message when no search is active but filters are too restrictive
                <>
                  <h3 className="text-xl font-medium mb-4">
                    <span className="text-red-600">!!</span><span> Go to Filter in the toolbar</span>
                  </h3>
                  <p className="text-muted-foreground">
                    Add categories or select <strong>All categories</strong> to view the entire collection. 
                  </p>
                </>
              )}
            </>
          ) : activeTab === 'wishlist' ? (
            <>
              {hasAnyItems === false ? (
                // No wishlist items at all
                <>
                  <h3 className="text-xl font-medium mb-4">
                    <span>No banknotes from {countryName || 'this country'} were added to the Wishlist.</span>
                  </h3>
                </>
              ) : hasAnyItems === true ? (
                // Wishlist items exist but none match current filters
                <>
                  <h3 className="text-xl font-medium mb-4">
                    <span className="text-red-600">!!</span><span> Go to Filter in the toolbar</span>
                  </h3>
                  <p className="text-muted-foreground">
                    Add categories or select <strong>All categories</strong> to view the entire collection. 
                  </p>
                </>
              ) : isSearching ? (
                // Show search-specific message when user is searching
                <>
                  <h3 className="text-xl font-medium mb-4"><span>No wishlist items found</span></h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
                </>
              ) : (
                // Default case: show filter guidance message (when hasAnyItems is undefined)
                <>
                  <h3 className="text-xl font-medium mb-4">
                    <span className="text-red-600">!!</span><span> Go to Filter in the toolbar</span>
                  </h3>
                  <p className="text-muted-foreground">
                    Add categories or select <strong>All categories</strong> to view the entire collection. 
                  </p>
                </>
              )}
            </>
          ) : isSearching ? (
            // Show search-specific message when user is searching
            <>
              <h3 className="text-xl font-medium mb-4"><span>No collection items found</span></h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
            </>
          ) : (
            // Show filter guidance message when no search is active but filters are too restrictive
            <>
              <h3 className="text-xl font-medium mb-4">
                <span className="text-red-600">!!</span><span> Go to Filter in the toolbar</span>
              </h3>
              <p className="text-muted-foreground">
                Add categories or select <strong>All categories</strong> to view the entire collection. 
              </p>
            </>
          )}
        </div>
      ) : (
        <LazyCollectionDisplay
          groups={groups}
          showSultanGroups={showSultanGroups}
          viewMode={viewMode}
          isLoading={isLoading}
          groupMode={groupMode}
          countryId={countryId}
          onUpdate={handleUpdate}
          isOwner={isOwner}
        />
      )}
    </div>
  );
};
