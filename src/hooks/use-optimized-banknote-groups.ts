import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { getMixedBanknoteItems, getMixedBanknoteItemsBySultan, MixedBanknoteItem } from '@/utils/banknoteGrouping';

interface CategoryDefinition {
  name: string;
  order: number;
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
    console.log(`\n📋 [useOptimizedBanknoteGroups Debug] Category order data:`, categoryOrder);
    categoryOrder.forEach(category => {
      const normalizedKey = category.name.toLowerCase().trim();
      console.log(`  Mapping category: "${category.name}" -> normalized key: "${normalizedKey}" -> order: ${category.order}`);
      map.set(normalizedKey, category.order);
    });
    console.log(`  Final category order map:`, map);
    console.log(`  Specific check for "first kaime em. 1-6   (1840-1850)":`, map.get("first kaime em. 1-6   (1840-1850)"));
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

    // Debug: Log unique categories found in banknotes
    const uniqueCategories = [...new Set(banknotes.map(b => b.category || 'Uncategorized'))];
    console.log(`\n📊 [OptimizedBanknoteGroups Debug] Unique categories in banknotes:`, uniqueCategories);
    
    // Group banknotes by category
    banknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
      const categoryKey = category.toLowerCase().trim();

      // Special debugging for the problematic category
      if (category.includes("First Kaime Em. 1-6")) {
        console.log(`🔍 [Debug] Processing category: "${category}"`);
        console.log(`🔍 [Debug] Category key: "${categoryKey}"`);
        console.log(`🔍 [Debug] Category key length: ${categoryKey.length}`);
        console.log(`🔍 [Debug] Category key char codes:`, [...categoryKey].map(c => c.charCodeAt(0)));
        console.log(`🔍 [Debug] Map has key:`, categoryOrderMap.has(categoryKey));
        console.log(`🔍 [Debug] Map value:`, categoryOrderMap.get(categoryKey));
        console.log(`🔍 [Debug] All map keys:`, [...categoryOrderMap.keys()]);
        
        // Check each map key to see which one might match
        for (const [mapKey, mapValue] of categoryOrderMap.entries()) {
          if (mapKey.includes("first kaime em. 1-6")) {
            console.log(`🔍 [Debug] Found potential match in map: "${mapKey}" -> ${mapValue}`);
            console.log(`🔍 [Debug] Map key length: ${mapKey.length}`);
            console.log(`🔍 [Debug] Map key char codes:`, [...mapKey].map(c => c.charCodeAt(0)));
            console.log(`🔍 [Debug] Keys equal:`, mapKey === categoryKey);
          }
        }
      }
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
    console.log(`\n🔄 [OptimizedBanknoteGroups Debug] Before sorting - categories:`, 
      processedGroups.map(g => `"${g.category}" (${g.items.length} items)`));
    
    processedGroups.sort((a, b) => {
      const aOrder = categoryOrderMap.get(a.categoryId) || 999;
      const bOrder = categoryOrderMap.get(b.categoryId) || 999;
      
      console.log(`  Comparing categories: "${a.category}" (order: ${aOrder}) vs "${b.category}" (order: ${bOrder})`);
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Fallback to alphabetical if same order
      return a.category.localeCompare(b.category);
    });
    
    console.log(`\n✅ [OptimizedBanknoteGroups Debug] After sorting - final order:`, 
      processedGroups.map((g, i) => `${i + 1}. "${g.category}" (${g.items.length} items)`));

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