
import { useMemo } from 'react';
import { CollectionItem } from '@/types';

interface UseCollectionGroupsProps {
  items: CollectionItem[];
  showSultanGroups: boolean;
}

interface SultanGroup {
  sultan: string;
  items: CollectionItem[];
}

interface CollectionGroup {
  category: string;
  items: CollectionItem[];
  sultanGroups?: SultanGroup[];
}

export const useCollectionGroups = ({ items, showSultanGroups }: UseCollectionGroupsProps): CollectionGroup[] => {
  return useMemo(() => {
    if (!items?.length) return [];
    
    // Group items by category first
    const categoryGroups = new Map<string, CollectionItem[]>();
    
    items.forEach(item => {
      const category = item.banknote?.category || 'Uncategorized';
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)?.push(item);
    });
    
    // Convert to array and sort alphabetically
    const groupsArray = Array.from(categoryGroups.entries())
      .map(([category, categoryItems]) => {
        if (showSultanGroups) {
          // Further group by sultan within each category
          const sultanGroups = new Map<string, CollectionItem[]>();
          
          categoryItems.forEach(item => {
            const sultan = item.banknote?.sultanName || 'Unknown Sultan';
            if (!sultanGroups.has(sultan)) {
              sultanGroups.set(sultan, []);
            }
            sultanGroups.get(sultan)?.push(item);
          });
          
          // Convert sultan groups to array and sort alphabetically
          const sultanGroupsArray = Array.from(sultanGroups.entries())
            .map(([sultan, sultanItems]) => ({
              sultan,
              items: sultanItems.sort((a, b) => {
                // Sort by extended_pick_number within sultan groups
                const pickA = a.banknote?.extendedPickNumber || '';
                const pickB = b.banknote?.extendedPickNumber || '';
                return pickA.localeCompare(pickB, undefined, { numeric: true });
              })
            }))
            .sort((a, b) => a.sultan.localeCompare(b.sultan));
          
          return {
            category,
            items: categoryItems,
            sultanGroups: sultanGroupsArray
          };
        }
        
        return {
          category,
          items: categoryItems.sort((a, b) => {
            // When not showing sultan groups, sort by extended_pick_number within categories
            const pickA = a.banknote?.extendedPickNumber || '';
            const pickB = b.banknote?.extendedPickNumber || '';
            return pickA.localeCompare(pickB, undefined, { numeric: true });
          })
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));
    
    return groupsArray;
  }, [items, showSultanGroups]);
};
