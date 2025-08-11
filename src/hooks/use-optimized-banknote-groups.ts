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
  console.log("🚨 [DEBUG] useOptimizedBanknoteGroups called with categoryOrder:", categoryOrder);
  console.log("🚨 [DEBUG] This is a test to see if the file is being updated!");
  // Memoize category order map for O(1) lookups
  const categoryOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    console.log(`\n📋 [useOptimizedBanknoteGroups Debug] Category order data:`, categoryOrder);
    console.log(`  Category order array length:`, categoryOrder.length);
    console.log(`  Category order array type:`, typeof categoryOrder);
    console.log(`  Category order array:`, JSON.stringify(categoryOrder, null, 2));
    
    categoryOrder.forEach((category, index) => {
      const normalizedKey = category.name.toLowerCase().trim();
      console.log(`  [${index}] Mapping category: "${category.name}" -> normalized key: "${normalizedKey}" -> order: ${category.order}`);
      map.set(normalizedKey, category.order);
    });
    
    console.log(`  Final category order map:`, map);
    console.log(`  Map size:`, map.size);
    console.log(`  All map entries:`, Array.from(map.entries()));
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

    // Sort categories by their defined order from categoryOrder parameter
    console.log(`\n🔄 [Category Sorting Debug] Starting category sorting...`);
    console.log(`  Processed groups before sorting:`, processedGroups.map(g => g.category));
    console.log(`  Category order map keys:`, Array.from(categoryOrderMap.keys()));
    
    // Test: Hardcoded sort to verify sorting logic works
    console.log(`\n🧪 [Test Sort] Testing with hardcoded order...`);
    const testOrder = [
      "First Kaime Em. 1-6   (1840-1850)",
      "First Kaime Em. 7-14   (1851-1861)", 
      "War 1293 Banknotes  (1876-1877)",
      "World War 1. Banknotes  (1915-1918)",
      "Imperial Ottoman Bank",
      "Stamp Currency  (1917-1919)"
    ];
    
    const testSorted = processedGroups.sort((a, b) => {
      const aIndex = testOrder.indexOf(a.category);
      const bIndex = testOrder.indexOf(b.category);
      const aOrder = aIndex === -1 ? 999 : aIndex;
      const bOrder = bIndex === -1 ? 999 : bIndex;
      
      console.log(`🧪 [Test Sort] "${a.category}" (index: ${aIndex}) vs "${b.category}" (index: ${bIndex}) -> ${aOrder - bOrder}`);
      return aOrder - bOrder;
    });
    
    console.log(`🧪 [Test Sort] Test sorted result:`, testSorted.map(g => g.category));
    
    // Now try the real sorting
    const sortedGroups = processedGroups.sort((a, b) => {
      const aKey = a.category.toLowerCase().trim();
      const bKey = b.category.toLowerCase().trim();
      const aOrder = categoryOrderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER;
      
      console.log(`\n🔄 [Category Sorting Debug] Comparing categories:`);
      console.log(`  Category A: "${a.category}" -> Key: "${aKey}" -> Order: ${aOrder}`);
      console.log(`  Category B: "${b.category}" -> Key: "${bKey}" -> Order: ${bOrder}`);
      console.log(`  Comparison result: ${aOrder - bOrder}`);
      
      return aOrder - bOrder;
    });
    
    console.log(`\n✅ [OptimizedBanknoteGroups Debug] Categories after explicit sorting:`, 
      sortedGroups.map((g, i) => `${i + 1}. "${g.category}" (order: ${categoryOrderMap.get(g.category.toLowerCase().trim()) ?? 'undefined'})`));
    
    console.log(`\n✅ [OptimizedBanknoteGroups Debug] Final sorted order:`, 
      sortedGroups.map((g, i) => `${i + 1}. "${g.category}" (${g.items.length} items)`));

    // Log final sultan group order for each category
    console.log(`\n✅ [OptimizedBanknoteGroups] Final result:`);
    console.log(`  Total categories: ${processedGroups.length}`);
    
    sortedGroups.forEach((group, groupIndex) => {
      if (group.sultanGroups && group.sultanGroups.length > 0) {
        console.log(`\n📋 [OptimizedBanknoteGroups] Category ${groupIndex + 1}: "${group.category}"`);
        console.log(`  Sultan groups in final order:`);
        group.sultanGroups.forEach((sultanGroup, sultanIndex) => {
          console.log(`    ${sultanIndex + 1}. ${sultanGroup.sultan} (${sultanGroup.items.length} items)`);
        });
      }
    });

    return sortedGroups;
  }, [banknotes, sortFields, categoryOrderMap, sultanOrderMap]);
};