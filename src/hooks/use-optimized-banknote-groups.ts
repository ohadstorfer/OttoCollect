import { useMemo } from 'react';
import { DetailedBanknote } from '@/types';
import { getMixedBanknoteItems, getMixedBanknoteItemsBySultan, MixedBanknoteItem } from '@/utils/banknoteGrouping';

interface CategoryDefinition {
  name: string;
  name_ar?: string;
  name_tr?: string;
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

    
    categoryOrder.forEach((category, index) => {
      const normalizedKey = category.name.toLowerCase().trim();
      map.set(normalizedKey, category.order);
    });
    

    return map;
  }, [categoryOrder]);

  // Memoize the grouping logic
  return useMemo(() => {
    const showSultanGroups = sortFields.includes('sultan');
    

    
    if (!banknotes.length) {
      return [];
    }
    const groupsMap = new Map<string, BanknoteGroup>();

    // Debug: Log unique categories found in banknotes
    const uniqueCategories = [...new Set(banknotes.map(b => b.category || 'Uncategorized'))];
    
    // Group banknotes by category
    banknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
      const categoryKey = category.toLowerCase().trim();

      
      if (!groupsMap.has(categoryKey)) {
        // Find the category definition to get translation fields
        const categoryDef = categoryOrder.find(cat => cat.name.toLowerCase().trim() === categoryKey);
        
        groupsMap.set(categoryKey, {
          category,
          category_ar: categoryDef?.name_ar,
          category_tr: categoryDef?.name_tr,
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

    

    

    
    
    // Now try the real sorting
    const sortedGroups = processedGroups.sort((a, b) => {
      const aKey = a.category.toLowerCase().trim();
      const bKey = b.category.toLowerCase().trim();
      const aOrder = categoryOrderMap.get(aKey) ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrderMap.get(bKey) ?? Number.MAX_SAFE_INTEGER;
      
      return aOrder - bOrder;
    });
    
   
  
    

    return sortedGroups;
  }, [banknotes, sortFields, categoryOrderMap, sultanOrderMap]);
};