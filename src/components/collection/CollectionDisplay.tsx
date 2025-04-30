
import React, { useMemo } from "react";
import { CollectionItem } from "@/types";
import CollectionItemCard from "@/components/collection/CollectionItemCard"; 
import { DynamicFilterState } from "@/types/filter";
import { Button } from "@/components/ui/button";
import { groupCollectionItemsByCategory, groupCollectionItemsByCategoryAndSultan } from "@/utils/collectionUtils";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

interface CollectionDisplayProps {
  items: CollectionItem[];
  viewMode: 'grid' | 'list';
  groupMode: boolean;
  isLoading: boolean;
  isPublic: boolean;
  filters: DynamicFilterState;
}

export const CollectionDisplay: React.FC<CollectionDisplayProps> = ({
  items,
  viewMode,
  groupMode,
  isLoading,
  isPublic,
  filters
}) => {
  const navigate = useNavigate();
  
  // Filter items based on search, categories, and types
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    return items.filter(item => {
      // Search filter
      const searchLower = (filters.search || "").toLowerCase();
      const matchesSearch = !filters.search || 
        (item.banknote && Object.values(item.banknote)
          .filter(value => value !== null && value !== undefined && typeof value === 'string')
          .some(value => (value as string).toLowerCase().includes(searchLower))) ||
        (item.publicNote && item.publicNote.toLowerCase().includes(searchLower)) ||
        (item.privateNote && item.privateNote.toLowerCase().includes(searchLower)) ||
        (item.condition && item.condition.toLowerCase().includes(searchLower));
      
      // Category filter
      const matchesCategory = !filters.categories || filters.categories.length === 0 || 
        (item.banknote?.category && filters.categories.some(c => c === item.banknote?.category));
      
      // Type filter
      const matchesType = !filters.types || filters.types.length === 0 || 
        (item.banknote?.type && filters.types.some(t => t === item.banknote?.type));
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [items, filters]);
  
  // Group filtered items
  const groupedItems = useMemo(() => {
    const showSultanGroups = filters.sort && filters.sort.includes('sultan');
    
    if (showSultanGroups) {
      return groupCollectionItemsByCategoryAndSultan(filteredItems);
    } else {
      return groupCollectionItemsByCategory(filteredItems);
    }
  }, [filteredItems, filters.sort]);
  
  const handleAddNewItem = () => {
    navigate('/collection/new');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-medium mb-4">No items found in this collection</h3>
        {!isPublic && (
          <div>
            <p className="text-muted-foreground mb-4">Start adding items to your collection!</p>
            <Button onClick={handleAddNewItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banknote
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {groupMode ? (
        <div className="space-y-8">
          {groupedItems.map((group, index) => (
            <div key={index} className="mb-8">
              <h3 className="text-xl font-semibold mb-4 border-b pb-2">{group.category}</h3>
              
              {group.sultanGroups ? (
                // Sultan sub-grouping
                <div className="space-y-6">
                  {group.sultanGroups.map((sultanGroup, sIndex) => (
                    <div key={sIndex} className="ml-4">
                      <h4 className="text-lg font-medium mb-3">Sultan: {sultanGroup.sultan}</h4>
                      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'grid-cols-1 gap-3'}`}>
                        {sultanGroup.items.map(item => (
                          <CollectionItemCard
                            key={item.id}
                            item={item}
                            onUpdate={async () => {}} // Placeholder for future update logic
                            isPublic={isPublic}
                            viewMode={viewMode}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Regular grouping without sultan subgroups
                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'grid-cols-1 gap-3'}`}>
                  {group.items.map(item => (
                    <CollectionItemCard
                      key={item.id}
                      item={item}
                      onUpdate={async () => {}} // Placeholder for future update logic
                      isPublic={isPublic}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // No grouping, display all items in a grid/list
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'grid-cols-1 gap-3'}`}>
          {filteredItems.map(item => (
            <CollectionItemCard
              key={item.id}
              item={item}
              onUpdate={async () => {}} // Placeholder for future update logic
              isPublic={isPublic}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};
