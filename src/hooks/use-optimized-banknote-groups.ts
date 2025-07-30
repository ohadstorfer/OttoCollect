import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { getMixedBanknoteItems, getMixedBanknoteItemsBySultan, MixedBanknoteItem } from '@/utils/banknoteGrouping';

interface CategoryDefinition {
  id: string;
  name: string;
  display_order: number;
}

export interface BanknoteGroupedData {
  category: string;
  categoryId: string;
  items: DetailedBanknote[];
  mixedItems?: MixedBanknoteItem[];
  sultanGroups?: { sultan: string; items: MixedBanknoteItem[] }[];
}

interface BanknoteGroup extends BanknoteGroupedData {}

interface GroupingOptions {
  banknotes: DetailedBanknote[];
  sortFields: string[];
  categoryOrder: CategoryDefinition[];
}

// Optimized grouping with smart memoization
export const useOptimizedBanknoteGroups = ({ 
  banknotes, 
  sortFields, 
  categoryOrder 
}: GroupingOptions): BanknoteGroupedData[] => {
  // Memoize category order map for O(1) lookups
  const categoryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    categoryOrder.forEach(category => {
      map.set(category.name.toLowerCase(), category.display_order);
    });
    return map;
  }, [categoryOrder]);

  // Memoize the grouping logic
  return useMemo(() => {
    if (!banknotes.length) {
      return [];
    }

    const showSultanGroups = sortFields.includes('sultan');
    const groupsMap = new Map<string, BanknoteGroup>();

    // Group banknotes by category
    banknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
      const categoryKey = category.toLowerCase();

      if (!groupsMap.has(categoryKey)) {
        groupsMap.set(categoryKey, {
          category,
          categoryId: categoryKey,
          items: [],
          mixedItems: [],
          sultanGroups: []
        });
      }

      groupsMap.get(categoryKey)!.items.push(banknote);
    });

    // Process each group with optimized mixed items and sultan grouping
    const processedGroups = Array.from(groupsMap.values()).map(group => {
      if (showSultanGroups) {
        // Generate sultan groups with mixed items
        const sultanGroups = getMixedBanknoteItemsBySultan(group.items);
        return {
          ...group,
          sultanGroups: sultanGroups.map(sultanGroup => ({
            sultan: sultanGroup.sultan,
            items: sultanGroup.items
          }))
        };
      } else {
        // Generate mixed items without sultan grouping
        const mixedItems = getMixedBanknoteItems(group.items);
        return {
          ...group,
          mixedItems
        };
      }
    });

    // Sort groups by category order
    processedGroups.sort((a, b) => {
      const aOrder = categoryOrderMap.get(a.categoryId) || 999;
      const bOrder = categoryOrderMap.get(b.categoryId) || 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Fallback to alphabetical if same order
      return a.category.localeCompare(b.category);
    });

    return processedGroups;
  }, [banknotes, sortFields, categoryOrderMap]);
};