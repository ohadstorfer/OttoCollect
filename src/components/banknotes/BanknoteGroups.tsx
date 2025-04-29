

import React, { useState } from 'react';
import { DetailedBanknote } from '@/types';
import BanknoteDetailCard from './BanknoteDetailCard';
import { BanknoteCardGroup } from './BanknoteCardGroup';
import { BanknoteGroupDialog } from './BanknoteGroupDialog';
import { cn } from '@/lib/utils';
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { 
  BanknoteGroupData, 
  getMixedBanknoteItems, 
  MixedBanknoteItem, 
  getMixedBanknoteItemsBySultan 
} from '@/utils/banknoteGrouping';

interface BanknoteGroupsProps {
  groups: {
    category: string;
    items: DetailedBanknote[];
    sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
  }[];
  showSultanGroups: boolean;
  viewMode: 'grid' | 'list';
  countryId: string;
  isLoading?: boolean;
  groupMode?: boolean;
}

export const BanknoteGroups: React.FC<BanknoteGroupsProps> = ({
  groups,
  showSultanGroups,
  viewMode,
  countryId,
  isLoading = false,
  groupMode = false
}) => {
  const containerRef = useScrollRestoration(countryId, isLoading, showSultanGroups);
  const [selectedGroup, setSelectedGroup] = useState<BanknoteGroupData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleGroupClick = (group: BanknoteGroupData) => {
    setSelectedGroup(group);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-8">
      {groups.map((group, groupIndex) => (
        <div key={`group-${groupIndex}`} className="space-y-4">
          <div className="sticky top-[155px] sm:top-[105px] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 border-b w-auto -mx-6 md:mx-0 px-6 md:px-0">
            <h2 className="text-xl font-bold">{group.category}</h2>
          </div>

          <div className="space-y-6">
            {showSultanGroups && group.sultanGroups && !groupMode ? (
              // Sultan groups - original display without grouping
              group.sultanGroups.map((sultanGroup, sultanIndex) => (
                <div key={`sultan-${sultanGroup.sultan}-${sultanIndex}`} className="space-y-4">
                  <div className="sticky top-[200px] sm:top-[150px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-auto -mx-6 md:mx-0 px-6 md:px-0">
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
                    {sultanGroup.items.map((banknote, index) => (
                      <BanknoteDetailCard
                        key={`banknote-${group.category}-${sultanGroup.sultan}-${index}`}
                        banknote={banknote}
                        source="catalog"
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : showSultanGroups && group.sultanGroups && groupMode ? (
              // Sultan groups WITH grouping (new mode combining both)
              (() => {
                // Get sultan groups with mixed items (singles and groups)
                const sultanMixedItems = getMixedBanknoteItemsBySultan(group.sultanGroups);
                
                return sultanMixedItems.map((sultanGroup, sultanIndex) => (
                  <div key={`sultan-group-${sultanGroup.sultan}-${sultanIndex}`} className="space-y-4">
                    <div className="sticky top-[200px] sm:top-[150px] z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 w-auto -mx-6 md:mx-0 px-6 md:px-0">
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
                      {sultanGroup.mixedItems.map((item, itemIndex) => {
                        if (item.type === 'single') {
                          return (
                            <BanknoteDetailCard
                              key={`single-${group.category}-${sultanGroup.sultan}-${item.banknote.id || itemIndex}`}
                              banknote={item.banknote}
                              source="catalog"
                            />
                          );
                        } else {
                          return (
                            <BanknoteCardGroup
                              key={`group-${group.category}-${sultanGroup.sultan}-${item.group.baseNumber}`}
                              group={item.group}
                              onClick={handleGroupClick}
                            />
                          );
                        }
                      })}
                    </div>
                  </div>
                ));
              })()
            ) : (
              // Normal display (no sultan groups) or group mode without sultan sorting
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4"
                  : "flex flex-col space-y-2",
                "px-2 sm:px-0"
              )}>
                {groupMode ? (
                  // Group mode display using the getMixedBanknoteItems function
                  (() => {
                    const mixedItems = getMixedBanknoteItems(group.items);
                    
                    return mixedItems.map((item, index) => {
                      if (item.type === 'single') {
                        return (
                          <BanknoteDetailCard
                            key={`single-${group.category}-${item.banknote.id || index}`}
                            banknote={item.banknote}
                            source="catalog"
                          />
                        );
                      } else {
                        return (
                          <BanknoteCardGroup
                            key={`group-${group.category}-${item.group.baseNumber}`}
                            group={item.group}
                            onClick={handleGroupClick}
                          />
                        );
                      }
                    });
                  })()
                ) : (
                  // Normal display
                  group.items.map((banknote, index) => (
                    <BanknoteDetailCard
                      key={`banknote-${group.category}-${index}`}
                      banknote={banknote}
                      source="catalog"
                    />
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
        />
      )}
    </div>
  );
};

