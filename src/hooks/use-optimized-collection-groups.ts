import { useMemo } from 'react';
import { CollectionItem } from '@/types';

export interface CollectionGroupedData {
  category: string;
  items: CollectionItem[];
  sultanGroups?: { sultan: string; items: CollectionItem[] }[];
}

interface CollectionGroupingOptions {
  collectionItems: CollectionItem[];
  sortFields: string[];
  categoryOrder: string[];
  groupMode?: boolean;
}

export const useOptimizedCollectionGroups = ({ 
  collectionItems, 
  sortFields, 
  categoryOrder,
  groupMode = false
}: CollectionGroupingOptions): CollectionGroupedData[] => {
  
  return useMemo(() => {
    if (!collectionItems.length) {
      return [];
    }

    console.log(`[OptimizedCollectionGroups] Grouping ${collectionItems.length} items with groupMode: ${groupMode}`);
    const startTime = performance.now();

    // Create category map for O(1) lookups
    const categoryOrderMap = new Map<string, number>();
    categoryOrder.forEach((category, index) => {
      categoryOrderMap.set(category, index);
    });

    // Group items by category efficiently
    const categoryMap = new Map<string, CollectionItem[]>();
    
    for (const item of collectionItems) {
      const category = item.banknote?.category || 'Uncategorized';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(item);
    }

    // Convert to array and apply custom ordering
    const grouped = Array.from(categoryMap.entries()).map(([category, items]) => {
      let groupData: CollectionGroupedData = { category, items };

      // Add sultan grouping if in group mode and items exist
      if (groupMode && items.length > 0) {
        const sultanMap = new Map<string, CollectionItem[]>();
        
        // Group by sultan within category
        for (const item of items) {
          const sultan = item.banknote?.sultanName || 'Unknown';
          
          if (!sultanMap.has(sultan)) {
            sultanMap.set(sultan, []);
          }
          sultanMap.get(sultan)!.push(item);
        }

        // Convert sultan map to array and sort alphabetically
        const sultanGroups = Array.from(sultanMap.entries())
          .map(([sultan, sultanItems]) => ({ sultan, items: sultanItems }))
          .sort((a, b) => a.sultan.localeCompare(b.sultan));

        groupData.sultanGroups = sultanGroups;
      }

      return groupData;
    });

    // Sort categories according to the category order
    grouped.sort((a, b) => {
      const aOrder = categoryOrderMap.get(a.category) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrderMap.get(b.category) ?? Number.MAX_SAFE_INTEGER;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If not in predefined order, sort alphabetically
      return a.category.localeCompare(b.category);
    });

    const endTime = performance.now();
    console.log(`[OptimizedCollectionGroups] Grouped into ${grouped.length} categories in ${(endTime - startTime).toFixed(2)}ms`);
    
    return grouped;
  }, [collectionItems, sortFields, categoryOrder, groupMode]);
};