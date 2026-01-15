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
  
  // Log when missing items are being displayed
  if (activeTab === 'missing') {
    console.log('🔍 [MissingItems] CollectionItemsDisplay - Rendering missing items');
    console.log('🔍 [MissingItems] Groups received:', groups.length);
    
    const totalItems = groups.reduce((sum, group) => {
      const groupItems = group.items?.length || 0;
      const sultanItems = group.sultanGroups?.reduce((s, sg) => s + (sg.items?.length || 0), 0) || 0;
      return sum + groupItems + sultanItems;
    }, 0);
    console.log('🔍 [MissingItems] Total items in CollectionItemsDisplay:', totalItems);
    
    // Log pick numbers in 40-60 range
    const allItems = groups.flatMap(group => {
      const groupItems = group.items || [];
      const sultanItems = group.sultanGroups?.flatMap(sg => sg.items || []) || [];
      return [...groupItems, ...sultanItems];
    });
    const displayPickNumbers40to60 = allItems
      .map(item => {
        const pick = item.extendedPickNumber || '';
        const match = pick.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num): num is number => num !== null && num >= 40 && num <= 60);
    console.log('🔍 [MissingItems] Pick numbers 40-60 in CollectionItemsDisplay:', displayPickNumbers40to60.length, 'samples:', displayPickNumbers40to60.slice(0, 10));
    
    // Log group details
    groups.forEach((group, idx) => {
      const groupItems = group.items?.length || 0;
      const sultanItems = group.sultanGroups?.reduce((s, sg) => s + (sg.items?.length || 0), 0) || 0;
      console.log(`🔍 [MissingItems] Group ${idx}: category="${group.category}", items=${groupItems}, sultanGroups=${group.sultanGroups?.length || 0}, sultanItems=${sultanItems}`);
    });
  }
  
  // Function to update collection items after changes
  const handleUpdate = async () => {
    // In a real implementation, we would call a function from props
    // that refreshes the collection data
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
