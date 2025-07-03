import React, { useState, useEffect } from 'react';
import { CollectionItem, DetailedBanknote } from '@/types';
import CollectionItemCard from './CollectionItemCard';
import CollectionCardUnlisted from './CollectionCardUnlisted';
import { CollectionItemCardGroup } from './CollectionItemCardGroup';
import { CollectionItemGroupDialog } from './CollectionItemGroupDialog';
import { cn } from '@/lib/utils';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { BanknoteGroupData } from '@/utils/banknoteGrouping';
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';

interface CollectionGroupItem {
  type: 'single' | 'group';
  collectionItem?: CollectionItem;
  group?: {
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  };
}

interface CollectionItemsGroupsProps {
  groups: {
    category: string;
    items: CollectionItem[];
    sultanGroups?: { sultan: string; items: CollectionItem[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading?: boolean;
  groupMode?: boolean;
  onUpdate: () => Promise<void>;
  isOwner: boolean;
}

export const CollectionItemsGroups: React.FC<CollectionItemsGroupsProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading = false,
  groupMode = false,
  onUpdate,
  isOwner
}) => {
  console.log("CollectionItemsGroups - isOwner:", isOwner);
  const containerRef = useScrollRestoration(countryId, isLoading, showSultanGroups);
  const [selectedGroup, setSelectedGroup] = useState<{
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const {
    dialogState,
    saveDialogState,
    isReturningFromDetail,
    clearReturningFlag
  } = useBanknoteDialogState(countryId);

  // Effect to handle dialog restoration when returning from detail view
  useEffect(() => {
    if (!isLoading && isReturningFromDetail() && dialogState && !dialogOpen) {
      // Find the group that matches the stored state
      const storedBaseNumber = dialogState.baseNumber;
      let foundGroup: {
        baseNumber: string;
        items: CollectionItem[];
        count: number;
      } | null = null;
      
      // Safety check for groups
      if (!groups || groups.length === 0) {
        console.log("No groups available to restore dialog");
        return;
      }
      
      // Search through all categories and groups
      for (const category of groups) {
        if (groupMode) {
          // In group mode, we need to check mixed items
          const mixedItems = getCollectionItemGroups(category.items);
          for (const item of mixedItems) {
            if (item.type === 'group' && item.group && item.group.baseNumber === storedBaseNumber) {
              foundGroup = item.group;
              break;
            }
          }
        } else {
          // In regular mode, just find matching collection items
          const matchingItems = category.items.filter(item => 
            dialogState.itemIds.includes(item.id)
          );
          
          if (matchingItems.length > 0) {
            foundGroup = {
              baseNumber: storedBaseNumber,
              items: matchingItems,
              count: matchingItems.length
            };
            break;
          }
        }
        
        if (foundGroup) break;
      }
      
      if (foundGroup) {
        setSelectedGroup(foundGroup);
        setDialogOpen(true);
      }
      
      // Clear the returning flag to prevent reopening on subsequent renders
      clearReturningFlag();
    }
  }, [groups, isLoading, isReturningFromDetail, dialogState, dialogOpen, groupMode, clearReturningFlag]);

  const handleGroupClick = (group: {
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  }) => {
    setSelectedGroup(group);
    setDialogOpen(true);
    
    // Save the dialog state
    saveDialogState({
      isOpen: true,
      baseNumber: group.baseNumber,
      itemIds: group.items.map(item => item.id),
      countryId,
      viewMode
    });
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    saveDialogState(null); // Clear dialog state when closed
  };

  // Function to get collection item groups similar to getMixedBanknoteItems
  const getCollectionItemGroups = (items: CollectionItem[]): CollectionGroupItem[] => {
    if (!groupMode || items.length === 0) {
      return items.map(item => ({
        type: 'single',
        collectionItem: item
      }));
    }

    // Group by base pick number, but only for non-unlisted banknotes
    const groupMap = new Map<string, CollectionItem[]>();
    const unlistedItems: CollectionItem[] = [];
    
    items.forEach(item => {
      // If it's an unlisted banknote, don't group it
      if (item.is_unlisted_banknote) {
        unlistedItems.push(item);
        return;
      }

      if (!item.banknote || !item.banknote.extendedPickNumber) return;
      
      // Get base pick number (without letters, just the numeric part)
      const basePickNumber = item.banknote.extendedPickNumber.replace(/([A-Za-z].*$)/g, '');
      
      if (!groupMap.has(basePickNumber)) {
        groupMap.set(basePickNumber, []);
      }
      
      groupMap.get(basePickNumber)?.push(item);
    });
    
    const result: CollectionGroupItem[] = [];
    
    // Add unlisted items as single items
    unlistedItems.forEach(item => {
      result.push({
        type: 'single',
        collectionItem: item
      });
    });
    
    // Convert the map to array of group items for regular banknotes
    groupMap.forEach((groupItems, baseNumber) => {
      if (groupItems.length > 1) {
        result.push({
          type: 'group',
          group: {
            baseNumber,
            items: groupItems,
            count: groupItems.length
          }
        });
      } else {
        result.push({
          type: 'single',
          collectionItem: groupItems[0]
        });
      }
    });
    
    return result;
  };

  // Safety check for empty groups
  if (!groups || groups.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No collection items to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-8 w-full">
      {groups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className="space-y-4 w-full">
          <div className="sticky top-[245px] sm:top-[150px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold">{group.category}</h2>
          </div>

          <div className="space-y-6 w-full">
            {showSultanGroups ? (
              // Sultan groups display
              group.sultanGroups && group.sultanGroups.length > 0 ? (
                group.sultanGroups.map((sultanGroup, sultanIndex) => (
                  <div key={`sultan-${sultanGroup.sultan}-${sultanIndex}`} className="space-y-4 w-full">
                    <div className="sticky top-[290px] sm:top-[195px] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:mx-0 px-6 md:px-0">
                      <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                        {sultanGroup.sultan}
                      </h3>
                    </div>
                    <div className={cn(
                      viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 grid-flow-row auto-rows-auto px-2 sm:px-0"
                        : "flex flex-col space-y-2 w-full !px-0",
                    )}>
                      {groupMode ? (
                        // Combined mode: sultan groups + collection item groups
                        (() => {
                          const mixedItems = getCollectionItemGroups(sultanGroup.items);
                          
                          return mixedItems.map((item, index) => {
                            if (item.type === 'single' && item.collectionItem) {
                              return (
                                <div key={`single-${sultanGroup.sultan}-${item.collectionItem.id || index}`} 
                                  className={cn(
                                    viewMode === 'grid' ? "self-start" : "w-full !px-0"
                                  )}
                                >
                                  {item.collectionItem.is_unlisted_banknote ? (
                                    <CollectionCardUnlisted
                                      item={item.collectionItem}
                                      onEdit={() => {}}
                                      onUpdate={onUpdate}
                                      viewMode={viewMode}
                                      isOwner={isOwner}
                                    />
                                  ) : (
                                    <CollectionItemCard
                                      item={item.collectionItem}
                                      onEdit={() => {}}
                                      onUpdate={onUpdate}
                                      viewMode={viewMode}
                                      isOwner={isOwner}
                                    />
                                  )}
                                </div>
                              );
                            } else if (item.type === 'group' && item.group) {
                              return (
                                <div key={`group-${sultanGroup.sultan}-${item.group.baseNumber}`} 
                                  className={cn(
                                    viewMode === 'grid' ? "self-start" : "w-full !px-0"
                                  )}
                                >
                                  <CollectionItemCardGroup
                                    group={item.group}
                                    onClick={handleGroupClick}
                                    viewMode={viewMode}
                                  />
                                </div>
                              );
                            }
                            return null;
                          });
                        })()
                      ) : (
                        // Regular sultan display without collection item grouping
                        sultanGroup.items.map((item, index) => (
                          <div key={`item-${group.category}-${sultanGroup.sultan}-${index}`} 
                            className={cn(
                              viewMode === 'grid' ? "self-start" : "w-full !px-0"
                            )}
                          >
                            <CollectionItemCard
                              item={item}
                              onEdit={() => {}}
                              onUpdate={onUpdate}
                              viewMode={viewMode}
                              isOwner={isOwner}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 w-full">
                  <p className="text-muted-foreground">No sultan groups found</p>
                </div>
              )
            ) : (
              // Normal or grouped display (no sultan grouping)
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 grid-flow-row auto-rows-auto px-2 sm:px-0"
                  : "flex flex-col space-y-2 w-full !px-0",
              )}>
                {groupMode ? (
                  // Group mode display
                  (() => {
                    const mixedItems = getCollectionItemGroups(group.items);
                    
                    return mixedItems.map((item, index) => {
                      if (item.type === 'single' && item.collectionItem) {
                        return (
                          <div key={`single-${group.category}-${item.collectionItem.id || index}`} 
                            className={cn(
                              viewMode === 'grid' ? "self-start" : "w-full !px-0"
                            )}
                          >
                            {item.collectionItem.is_unlisted_banknote ? (
                              <CollectionCardUnlisted
                                item={item.collectionItem}
                                onEdit={() => {}}
                                onUpdate={onUpdate}
                                viewMode={viewMode}
                                isOwner={isOwner}
                              />
                            ) : (
                              <CollectionItemCard
                                item={item.collectionItem}
                                onEdit={() => {}}
                                onUpdate={onUpdate}
                                viewMode={viewMode}
                                isOwner={isOwner}
                              />
                            )}
                          </div>
                        );
                      } else if (item.type === 'group' && item.group) {
                        return (
                          <div key={`group-${group.category}-${item.group.baseNumber}`} 
                            className={cn(
                              viewMode === 'grid' ? "self-start" : "w-full !px-0"
                            )}
                          >
                            <CollectionItemCardGroup
                              group={item.group}
                              onClick={handleGroupClick}
                              viewMode={viewMode}
                            />
                          </div>
                        );
                      }
                      return null;
                    });
                  })()
                ) : (
                  // Normal display
                  group.items.map((item, index) => (
                    <div key={`item-${group.category}-${index}`} 
                      className={cn(
                        viewMode === 'grid' ? "self-start" : "w-full !px-0"
                      )}
                    >
                      {item.is_unlisted_banknote ? (
                        <CollectionCardUnlisted
                          item={item}
                          onEdit={() => {}}
                          onUpdate={onUpdate}
                          viewMode={viewMode}
                          isOwner={isOwner}
                        />
                      ) : (
                        <CollectionItemCard
                          item={item}
                          onEdit={() => {}}
                          onUpdate={onUpdate}
                          viewMode={viewMode}
                          isOwner={isOwner}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {selectedGroup && (
        <CollectionItemGroupDialog
          isOpen={dialogOpen}
          onClose={handleCloseDialog}
          groupBaseNumber={selectedGroup.baseNumber}
          collectionItems={selectedGroup.items}
          viewMode={viewMode}
          countryId={countryId}
          onUpdate={onUpdate}
          isOwner={isOwner}
        />
      )}
    </div>
  );
};
