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
  sultanGroups?: { sultan: string; items: DetailedBanknote[] }[];
}

interface BanknoteGroup extends BanknoteGroupedData {}

interface GroupingOptions {
  banknotes: DetailedBanknote[];
  sortFields: string[];
  categoryOrder: CategoryDefinition[];
  countryId?: string;
  sultanOrderMap?: Map<string, number>;
}

// Optimized grouping with smart memoization
export const useOptimizedBanknoteGroups = ({ 
  banknotes, 
  sortFields, 
  categoryOrder,
  countryId,
  sultanOrderMap
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
    const showSultanGroups = sortFields.includes('sultan');
    
    console.log(`\n🚀 [useOptimizedBanknoteGroups Debug] Starting grouping process:`);
    console.log(`  Sultan order map:`, sultanOrderMap);
    console.log(`  Show sultan groups:`, showSultanGroups);
    console.log(`  Country ID:`, countryId);
    console.log(`  Total banknotes:`, banknotes.length);
    
    if (!banknotes.length) {
      return [];
    }
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
        const sultanGroups = getMixedBanknoteItemsBySultan(group.items, sultanOrderMap);
        return {
          ...group,
          sultanGroups: sultanGroups.map(sultanGroup => ({
            sultan: sultanGroup.sultan,
            items: sultanGroup.items.flatMap(item => 
              item.type === 'single' ? [item.banknote] : item.group.items
            )
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

    // Log final sultan group order for each category
    console.log(`\n✅ [OptimizedBanknoteGroups] Final result:`);
    console.log(`  Total categories: ${processedGroups.length}`);
    
    processedGroups.forEach((group, groupIndex) => {
      if (group.sultanGroups && group.sultanGroups.length > 0) {
        console.log(`\n📋 [OptimizedBanknoteGroups] Category ${groupIndex + 1}: "${group.category}"`);
        console.log(`  Sultan groups in final order:`);
        group.sultanGroups.forEach((sultanGroup, sultanIndex) => {
          console.log(`    ${sultanIndex + 1}. ${sultanGroup.sultan} (${sultanGroup.items.length} items)`);
        });
      }
    });

    return processedGroups;
  }, [banknotes, sortFields, categoryOrderMap, sultanOrderMap]);
};