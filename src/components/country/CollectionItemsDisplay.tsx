import React from "react";
import { CollectionItem } from "@/types";
import { CollectionItemsGroups } from "@/components/collection/CollectionItemsGroups";
import { cn } from "@/lib/utils";
import LazyCollectionDisplay from "./LazyCollectionDisplay";

interface CollectionItemsDisplayProps {
  groups: {
    category: string;
    items: CollectionItem[];
    sultanGroups?: { sultan: string; items: CollectionItem[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading: boolean;
  groupMode: boolean;
  isOwner: boolean;
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  countryName?: string;
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
  countryName
}) => {
  // Debug logging for props
  console.log('CollectionItemsDisplay: Received props:', { viewMode, groupMode, activeTab, groupsCount: groups.length });
  
  // Function to update collection items after changes
  const handleUpdate = async () => {
    // In a real implementation, we would call a function from props
    // that refreshes the collection data
    console.log("Collection update requested");
    return Promise.resolve();
  };

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
              <h3 className="text-xl font-medium mb-4">
                <span>No banknotes from {countryName || 'this country'} are currently listed for sale.</span>
              </h3>
              <p className="text-muted-foreground">
                {isOwner ? 'To list your banknotes for sale, edit your collection items.' : 'Check back later for new listings.'}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-medium mb-4"><span>No collection items found</span></h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
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
          onUpdate={handleUpdate}
          isOwner={isOwner}
        />
      )}
    </div>
  );
};
