import React, { useState, useEffect } from 'react';
import { DetailedBanknote, CollectionItem } from '@/types';
import BanknoteDetailCard from './BanknoteDetailCard';
import { BanknoteCardGroup } from './BanknoteCardGroup';
import { BanknoteGroupDialog } from './BanknoteGroupDialog';
import { cn } from '@/lib/utils';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { BanknoteGroupData, getMixedBanknoteItems, getMixedBanknoteItemsBySultan, MixedBanknoteItem } from '@/utils/banknoteGrouping';
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { useLanguage } from '@/context/LanguageContext';

interface BanknoteGroupsProps {
  groups: {
    category: string;
    category_ar?: string;
    category_tr?: string;
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
  isLoading?: boolean;
  groupMode?: boolean;
  userCollection: CollectionItem[]; // <-- ADDED
}

export const BanknoteGroups: React.FC<BanknoteGroupsProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading = false,
  groupMode = false,
  userCollection // <-- ADDED
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
  const [selectedGroup, setSelectedGroup] = useState<BanknoteGroupData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const { direction } = useLanguage();

  // Add effect to force re-render when groupMode changes
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [groupMode]);

  useEffect(() => {
    const handleGroupModeChange = (event: CustomEvent) => {
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('groupModeChange', handleGroupModeChange as EventListener);
    return () => {
      window.removeEventListener('groupModeChange', handleGroupModeChange as EventListener);
    };
  }, []);
  
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
      let foundGroup: BanknoteGroupData | null = null;
      
      // Safety check for groups
      if (!groups || groups.length === 0) {
        return;
      }
      
      // Search through all categories and groups
      for (const category of groups) {
        if (groupMode) {
          // In group mode, we need to check mixed items
          const mixedItems = getMixedBanknoteItems(category.items);
          for (const item of mixedItems) {
            if (item.type === 'group' && item.group.baseNumber === storedBaseNumber) {
              foundGroup = item.group;
              break;
            }
          }
        } else {
          // In regular mode, just find matching banknotes
          const matchingBanknotes = category.items.filter(banknote => 
            dialogState.itemIds.includes(banknote.id)
          );
          
          if (matchingBanknotes.length > 0) {
            foundGroup = {
              baseNumber: storedBaseNumber,
              items: matchingBanknotes,
              count: matchingBanknotes.length
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

  const handleGroupClick = (group: BanknoteGroupData) => {
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

  // Safety check for empty groups
  if (!groups || groups.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No banknotes to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-8 w-full" key={`group-container-${forceUpdate}`}>
      {groups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}-${forceUpdate}`} className={cn("space-y-4 w-full", direction === 'rtl' ? 'text-right' : 'text-left')}>
          <div className="sticky top-[200px] sm:top-[150px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-full md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold"><span>{getTranslatedCategoryName(group)}</span></h2>
          </div>

          <div className="space-y-6 w-full">
            {showSultanGroups ? (
              // Sultan groups display
              group.sultanGroups && group.sultanGroups.length > 0 ? (
                group.sultanGroups.map((sultanGroup, sultanIndex) => (
                  <div key={`sultan-${sultanGroup.sultan}-${sultanIndex}-${forceUpdate}`} className="space-y-4 w-full">
                    <div className="sticky top-[245px] sm:top-[195px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-full md:mx-0 px-6 md:px-0">
                      <h3 className="text-lg font-semibold pl-4 border-l-4 border-primary">
                        <span>{getTranslatedSultanName(sultanGroup)}</span>
                      </h3>
                    </div>
                    <div className={cn(
                      viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 grid-flow-row auto-rows-auto"
                        : "flex flex-col space-y-2 w-full overflow-hidden",
                      "px-2 sm:px-0"
                    )}>
                      {groupMode ? (
                        (() => {
                          const mixedItems = getMixedBanknoteItems(sultanGroup.items);

                         

                          return mixedItems.map((item, index) => {
                            if (item.type === 'single') {
                              return (
                                <div key={`single-${sultanGroup.sultan}-${item.banknote.id || index}-${forceUpdate}`} className={cn(
                                  viewMode === 'grid' ? "self-start" : "w-full"
                                )}>
                                  <BanknoteDetailCard
                                    banknote={item.banknote}
                                    source="catalog"
                                    viewMode={viewMode}
                                    countryId={countryId}
                                    fromGroup={false}
                                    userCollection={userCollection}
                                  />
                                </div>
                              );
                            } else {
                              return (
                                <div key={`group-${sultanGroup.sultan}-${item.group.baseNumber}-${forceUpdate}`} className={cn(
                                  viewMode === 'grid' ? "self-start" : "w-full"
                                )}>
                                  <BanknoteCardGroup
                                    group={item.group}
                                    onClick={handleGroupClick}
                                    viewMode={viewMode}
                                  />
                                </div>
                              );
                            }
                          });
                        })()
                      ) : (
                        sultanGroup.items.map((banknote, index) => (
                          <div key={`banknote-${group.category}-${sultanGroup.sultan}-${index}-${forceUpdate}`} className={cn(
                            viewMode === 'grid' ? "self-start" : "w-full"
                          )}>
                            <BanknoteDetailCard
                              banknote={banknote}
                              source="catalog"
                              viewMode={viewMode}
                              countryId={countryId}
                              fromGroup={false}
                              userCollection={userCollection}
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
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 grid-flow-row auto-rows-auto"
                  : "flex flex-col space-y-2 w-full overflow-hidden",
                "px-2 sm:px-0"
              )}>
                {groupMode ? (
                  (() => {
                    const mixedItems = getMixedBanknoteItems(group.items);
                    
                    return mixedItems.map((item, index) => {
                      if (item.type === 'single') {
                        return (
                          <div key={`single-${group.category}-${item.banknote.id || index}-${forceUpdate}`} className={cn(
                            viewMode === 'grid' ? "self-start" : "w-full"
                          )}>
                            <BanknoteDetailCard
                              banknote={item.banknote}
                              source="catalog"
                              viewMode={viewMode}
                              countryId={countryId}
                              fromGroup={false}
                              userCollection={userCollection}
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div key={`group-${group.category}-${item.group.baseNumber}-${forceUpdate}`} className={cn(
                            viewMode === 'grid' ? "self-start" : "w-full"
                          )}>
                            <BanknoteCardGroup
                              group={item.group}
                              onClick={handleGroupClick}
                              viewMode={viewMode}
                            />
                          </div>
                        );
                      }
                    });
                  })()
                ) : (
                  group.items.map((banknote, index) => (
                    <div key={`banknote-${group.category}-${index}-${forceUpdate}`} className={cn(
                      viewMode === 'grid' ? "self-start" : "w-full"
                    )}>
                      <BanknoteDetailCard
                        banknote={banknote}
                        source="catalog"
                        viewMode={viewMode}
                        countryId={countryId}
                        fromGroup={false}
                        userCollection={userCollection}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {selectedGroup && (
        <BanknoteGroupDialog
          isOpen={dialogOpen}
          onClose={handleCloseDialog}
          groupBaseNumber={selectedGroup.baseNumber}
          banknotes={selectedGroup.items}
          viewMode={viewMode}
          countryId={countryId}
        />
      )}
    </div>
  );
};
