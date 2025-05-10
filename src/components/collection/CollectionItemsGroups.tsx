import React from "react";
import { CollectionItem } from "@/types";
import CollectionItemCard from "./CollectionItemCard";
import { CollectionItemCardGroup } from "./CollectionItemCardGroup";

interface CollectionItemsGroupsProps {
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
  onUpdate: () => Promise<void>;
  isOwner: boolean;
}

export const CollectionItemsGroups: React.FC<CollectionItemsGroupsProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading,
  groupMode,
  onUpdate,
  isOwner
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4">No Items Found</h3>
        <p className="text-muted-foreground mb-6">
          No items match your current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className="space-y-4">
          <div className="sticky top-[100px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold">{group.category}</h2>
          </div>
          
          {group.sultanGroups && showSultanGroups ? (
            // Group by sultan within category
            <div className="space-y-6">
              {group.sultanGroups.map((sultanGroup, sultanIndex) => (
                <div key={`sultan-${sultanIndex}`} className="space-y-4">
                  <div className="sticky top-[150px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:w-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                      {sultanGroup.sultan}
                    </h3>
                  </div>
                  
                  <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                    {sultanGroup.items.map((item) => (
                      <CollectionItemCard
                        key={item.id}
                        item={item}
                        onEdit={() => {}}
                        onUpdate={onUpdate}
                        viewMode={viewMode}
                        isOwner={isOwner}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Simple category grouping
            groupMode ? (
              <CollectionItemCardGroup 
                items={group.items} 
                countryId={countryId} 
                isOwner={isOwner}
              />
            ) : (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
                {group.items.map((item) => (
                  <CollectionItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => {}}
                    onUpdate={onUpdate}
                    viewMode={viewMode}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
};
