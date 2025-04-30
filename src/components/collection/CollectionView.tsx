
import React, { useState } from 'react';
import { CollectionItem } from '@/types';
import { cn } from '@/lib/utils';
import CollectionItemCard from './CollectionItemCard';

interface CollectionViewProps {
  groups: {
    category: string;
    items: CollectionItem[];
    sultanGroups?: { sultan: string; items: CollectionItem[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  isPublicView: boolean;
  isLoading?: boolean;
  onItemEdit?: (item: CollectionItem) => void;
  onCollectionUpdated?: () => Promise<void>;
}

export const CollectionView: React.FC<CollectionViewProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  isPublicView,
  isLoading = false,
  onItemEdit,
  onCollectionUpdated
}) => {
  // Safety check for empty groups
  if (!groups || groups.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className="space-y-4">
          <div className="sticky top-[155px] sm:top-[105px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-auto md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold">{group.category}</h2>
          </div>

          <div className="space-y-6">
            {showSultanGroups && group.sultanGroups && group.sultanGroups.length > 0 ? (
              // Sultan groups display
              group.sultanGroups.map((sultanGroup, sultanIndex) => (
                <div key={`sultan-${sultanGroup.sultan}-${sultanIndex}`} className="space-y-4">
                  <div className="sticky top-[200px] sm:top-[150px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-auto md:mx-0 px-6 md:px-0">
                    <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                      {sultanGroup.sultan}
                    </h3>
                  </div>
                  <div className={cn(
                    viewMode === 'grid'
                      ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4"
                      : "flex flex-col space-y-2",
                    "px-2 sm:px-0"
                  )}>
                    {sultanGroup.items.map((item, index) => (
                      <CollectionItemCard
                        key={`item-${sultanGroup.sultan}-${item.id || index}`}
                        item={item}
                        isPublicView={isPublicView}
                        onItemEdit={onItemEdit}
                        onCollectionUpdated={onCollectionUpdated}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Regular display without sultan grouping
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4"
                  : "flex flex-col space-y-2",
                "px-2 sm:px-0"
              )}>
                {group.items.map((item, index) => (
                  <CollectionItemCard
                    key={`item-${group.category}-${item.id || index}`}
                    item={item}
                    isPublicView={isPublicView}
                    onItemEdit={onItemEdit}
                    onCollectionUpdated={onCollectionUpdated}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollectionView;
