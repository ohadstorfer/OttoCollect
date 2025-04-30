
import { CollectionItem } from "@/types";

type GroupedCollection = {
  category: string;
  items: CollectionItem[];
  sultanGroups?: { sultan: string; items: CollectionItem[] }[];
};

/**
 * Groups collection items by category (series)
 * @param items Collection items to group
 * @returns Array of grouped items
 */
export const groupCollectionItemsByCategory = (
  items: CollectionItem[]
): GroupedCollection[] => {
  const categoryMap = new Map<string, CollectionItem[]>();
  
  // Group items by series
  items.forEach(item => {
    const series = item.banknote?.series || 'Uncategorized';
    if (!categoryMap.has(series)) {
      categoryMap.set(series, []);
    }
    categoryMap.get(series)?.push(item);
  });
  
  // Convert map to array and sort alphabetically by category
  return Array.from(categoryMap.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));
};

/**
 * Groups collection items by category (series) and then by sultan
 * @param items Collection items to group
 * @returns Array of grouped items with sultan sub-groups
 */
export const groupCollectionItemsByCategoryAndSultan = (
  items: CollectionItem[]
): GroupedCollection[] => {
  const grouped = groupCollectionItemsByCategory(items);
  
  // Add sultan grouping within each category
  return grouped.map(group => {
    const sultanMap = new Map<string, CollectionItem[]>();
    
    // Group by sultan
    group.items.forEach(item => {
      const sultan = item.banknote?.sultanName || 'Unknown';
      if (!sultanMap.has(sultan)) {
        sultanMap.set(sultan, []);
      }
      sultanMap.get(sultan)?.push(item);
    });
    
    // Convert sultan map to array and sort
    const sultanGroups = Array.from(sultanMap.entries())
      .map(([sultan, items]) => ({ sultan, items }))
      .sort((a, b) => a.sultan.localeCompare(b.sultan));
    
    return {
      ...group,
      sultanGroups
    };
  });
};

/**
 * Formats a price as a currency string
 * @param price The price to format
 * @returns Formatted price string
 */
export const formatCollectionPrice = (price?: number | null): string => {
  if (price === undefined || price === null) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
};
