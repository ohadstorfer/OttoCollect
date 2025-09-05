import React, { useState, useEffect } from 'react';
import { CollectionItem, DetailedBanknote } from '@/types';
import CollectionItemCard from './CollectionItemCard';
import CollectionCardUnlisted from './CollectionCardUnlisted';
import { CollectionItemCardGroup } from './CollectionItemCardGroup';
import { CollectionItemGroupDialog } from './CollectionItemGroupDialog';
import BanknoteDetailCardWishList from '@/components/banknotes/BanknoteDetailCardWishList';
import { BanknoteDetailCardGroupWishList } from '@/components/banknotes/BanknoteDetailCardGroupWishList';
import { BanknoteDetailCardGroupDialogWishList } from '@/components/banknotes/BanknoteDetailCardGroupDialogWishList';
import { cn } from '@/lib/utils';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { BanknoteGroupData } from '@/utils/banknoteGrouping';
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { useLanguage } from '@/context/LanguageContext';

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
    category_ar?: string;
    category_tr?: string;
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
  const { currentLanguage } = useLanguage();



  // Function to get the appropriate category name based on current language
  const getTranslatedCategoryName = (group: { category: string; category_ar?: string; category_tr?: string }) => {
    if (!group) return '';
    
    switch (currentLanguage) {
      case 'ar':
        return group.category_ar || group.category;
      case 'tr':
        return group.category_tr || group.category;
      default:
        return group.category;
    }
  };

  // Function to get the appropriate sultan name based on current language
  const getTranslatedSultanName = (sultanGroup: { sultan: string; sultan_ar?: string; sultan_tr?: string }) => {
    if (!sultanGroup) return '';
    
    
    
    switch (currentLanguage) {
      case 'ar':
        return sultanGroup.sultan_ar || sultanGroup.sultan;
      case 'tr':
        return sultanGroup.sultan_tr || sultanGroup.sultan;
      default:
        return sultanGroup.sultan;
    }
  };

  const containerRef = useScrollRestoration(countryId, isLoading, showSultanGroups);
  const [selectedGroup, setSelectedGroup] = useState<{
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { direction } = useLanguage();
  
  // Wishlist group dialog state
  const [selectedWishlistGroup, setSelectedWishlistGroup] = useState<{
    baseNumber: string;
    items: any[];
    count: number;
  } | null>(null);
  const [wishlistDialogOpen, setWishlistDialogOpen] = useState(false);
  
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
        return;
      }
      
      // Search through all categories and groups
      for (const category of groups) {
        if (groupMode) {
          // In group mode, we need to check mixed items
          const hasWishlistItems = category.items.some((item: any) => item.isWishlist);
          const mixedItems = hasWishlistItems 
            ? getWishlistItemGroups(category.items)  // Use dedicated wishlist grouping
            : getCollectionItemGroups(category.items); // Use collection grouping
          
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
    setSelectedGroup(null);
    setDialogOpen(false);
    saveDialogState(null); // Clear dialog state when closed
  };

  // Wishlist group handlers
  const handleWishlistGroupClick = (group: { baseNumber: string; items: any[]; count: number }) => {
    setSelectedWishlistGroup(group);
    setWishlistDialogOpen(true);
  };

  const handleCloseWishlistDialog = () => {
    setSelectedWishlistGroup(null);
    setWishlistDialogOpen(false);
  };

  // Function to get wishlist item groups (dedicated for wishlist items)
  const getWishlistItemGroups = (items: any[]): Array<{ type: 'single' | 'group'; collectionItem?: any; group?: { baseNumber: string; items: any[]; count: number } }> => {
    if (!groupMode || items.length === 0) {
      return items.map(item => ({
        type: 'single',
        collectionItem: item
      }));
    }

    // Group by base pick number
    const groupMap = new Map<string, any[]>();
    const result: Array<{ type: 'single' | 'group'; collectionItem?: any; group?: { baseNumber: string; items: any[]; count: number } }> = [];
    
    items.forEach(item => {
      const extendedPickNumber = item.extended_pick_number; // Use the exact field name from wishlist card
      
      if (!extendedPickNumber) {
        // Still add items without pick numbers as single items
        result.push({
          type: 'single',
          collectionItem: item
        });
        return;
      }
      
      // Get base pick number (without letters, just the numeric part)
      const basePickNumber = extendedPickNumber.replace(/([A-Za-z].*$)/g, '');
      
      if (!groupMap.has(basePickNumber)) {
        groupMap.set(basePickNumber, []);
      }
      groupMap.get(basePickNumber)!.push(item);
    });
    
    // Convert the map to array of group items
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

      if (!item.banknote || !item.banknote.extendedPickNumber) {
        // For wishlist items, check if extended_pick_number is at top level (matching BanknoteDetailCardWishList)
        if ((item as any).isWishlist && (item as any).extended_pick_number) {
          const basePickNumber = (item as any).extended_pick_number.replace(/([A-Za-z].*$)/g, '');
          
          if (!groupMap.has(basePickNumber)) {
            groupMap.set(basePickNumber, []);
          }
          
          groupMap.get(basePickNumber)?.push(item);
          return;
        }
        
        return;
      }
      
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
        <div key={`group-${groupIndex}`} className={cn("space-y-4 w-full", direction === 'rtl' ? 'text-right' : 'text-left')}>
          <div className="sticky top-[245px] sm:top-[150px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold"><span>{getTranslatedCategoryName(group)}</span></h2>
          </div>

          <div className="space-y-6 w-full">
            {showSultanGroups ? (
              // Sultan groups display
              group.sultanGroups && group.sultanGroups.length > 0 ? (
                group.sultanGroups.map((sultanGroup, sultanIndex) => (
                  <div key={`sultan-${sultanGroup.sultan}-${sultanIndex}`} className="space-y-4 w-full">
                    <div className="sticky top-[290px] sm:top-[195px] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:mx-0 px-6 md:px-0">
                      <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary"><span>{getTranslatedSultanName(sultanGroup)}</span></h3>
                    </div>
                    <div className={cn(
                      viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 grid-flow-row auto-rows-auto px-2 sm:px-0"
                        : "flex flex-col space-y-2 w-full !px-0",
                    )}>
                      {groupMode ? (
                        // Combined mode: sultan groups + collection item groups
                        (() => {
                          const hasWishlistItems = sultanGroup.items.some((item: any) => item.isWishlist);
                          const mixedItems = hasWishlistItems 
                            ? getWishlistItemGroups(sultanGroup.items)  // Use dedicated wishlist grouping
                            : getCollectionItemGroups(sultanGroup.items); // Use collection grouping
                          
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
                                  ) : (item.collectionItem as any).isWishlist ? (
                                    <BanknoteDetailCardWishList
                                      banknote={item.collectionItem.banknote || item.collectionItem}
                                      viewMode={viewMode}
                                      countryId={countryId}
                                      wishlistItemId={(item.collectionItem as any).wishlistItemId}
                                      source="catalog"
                                      onDeleted={() => onUpdate()}
                                      refetchWishlist={() => onUpdate()}
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
                                  {item.group.items.some((groupItem: any) => groupItem.isWishlist) ? (
                                    <>
                                      
                                      <BanknoteDetailCardGroupWishList
                                        group={item.group}
                                        onClick={handleWishlistGroupClick}
                                        viewMode={viewMode}
                                      />
                                    </>
                                  ) : (
                                    <CollectionItemCardGroup
                                      group={item.group}
                                      onClick={handleGroupClick}
                                      viewMode={viewMode}
                                    />
                                  )}
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
                            {(item as any).isWishlist ? (
                              <BanknoteDetailCardWishList
                                banknote={item.banknote || item}
                                viewMode={viewMode}
                                countryId={countryId}
                                wishlistItemId={(item as any).wishlistItemId}
                                source="catalog"
                                onDeleted={() => onUpdate()}
                                refetchWishlist={() => onUpdate()}
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
                   
                    
                    // Check if this group contains wishlist items
                    const hasWishlistItems = group.items.some((item: any) => item.isWishlist);
                    
                    const mixedItems = hasWishlistItems 
                      ? getWishlistItemGroups(group.items)  // Use dedicated wishlist grouping
                      : getCollectionItemGroups(group.items); // Use collection grouping
                    
                    
                    
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
                            ) : (item.collectionItem as any).isWishlist ? (
                              <BanknoteDetailCardWishList
                                banknote={item.collectionItem.banknote || item.collectionItem}
                                viewMode={viewMode}
                                countryId={countryId}
                                wishlistItemId={(item.collectionItem as any).wishlistItemId}
                                source="catalog"
                                onDeleted={() => onUpdate()}
                                refetchWishlist={() => onUpdate()}
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
                        // Check if this group contains wishlist items
                        const groupHasWishlistItems = item.group.items.some((groupItem: any) => groupItem.isWishlist);
                        
                        return (
                          <div key={`group-${group.category}-${item.group.baseNumber}`} 
                            className={cn(
                              viewMode === 'grid' ? "self-start" : "w-full !px-0"
                            )}
                          >
                            {groupHasWishlistItems ? (
                              <>
                              
                                <BanknoteDetailCardGroupWishList
                                  group={item.group}
                                  onClick={handleWishlistGroupClick}
                                  viewMode={viewMode}
                                />
                              </>
                            ) : (
                              <CollectionItemCardGroup
                                group={item.group}
                                onClick={handleGroupClick}
                                viewMode={viewMode}
                              />
                            )}
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
                      ) : (item as any).isWishlist ? (
                        <BanknoteDetailCardWishList
                          banknote={item.banknote || item}
                          viewMode={viewMode}
                          countryId={countryId}
                          wishlistItemId={(item as any).wishlistItemId}
                          source="catalog"
                          onDeleted={() => onUpdate()}
                          refetchWishlist={() => onUpdate()}
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
      
      {selectedWishlistGroup && (
        <BanknoteDetailCardGroupDialogWishList
          isOpen={wishlistDialogOpen}
          onClose={handleCloseWishlistDialog}
          groupBaseNumber={selectedWishlistGroup.baseNumber}
          wishlistItems={selectedWishlistGroup.items}
          viewMode={viewMode}
          countryId={countryId}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};
