
import { useMemo } from "react";
import { DetailedBanknote } from "@/types";
import { getSultanOrderMap } from "@/services/sultanOrderService";

interface CategoryOrder {
  name: string;
  order: number;
}

export const useBanknoteGroups = (
  banknotes: DetailedBanknote[],
  sortFields: string[],
  categoryOrder: CategoryOrder[],
  countryId?: string,
  sultanOrderMap?: Map<string, number>
) => {
  return useMemo(() => {
    const categoryMap = new Map();
    const showSultanGroups = sortFields.includes('sultan');
    
    console.log(`[useBanknoteGroups Debug] Sultan order map:`, sultanOrderMap);
    console.log(`[useBanknoteGroups Debug] Show sultan groups:`, showSultanGroups);
    console.log(`[useBanknoteGroups Debug] Country ID:`, countryId);
  
    const defaultSultanOrder = [
      "AbdulMecid",
      "AbdulAziz",
      "Murad",
      "AbdulHamid",
      "M.Resad",
      "M.Vahdeddin"
    ];
  
    banknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
  
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          categoryId: '',
          items: []
        });
      }
  
      categoryMap.get(category).items.push(banknote);
    });
  
    const groupArray = Array.from(categoryMap.values());
  
    if (categoryOrder.length > 0) {
      groupArray.sort((a, b) => {
        const orderA = categoryOrder.find(c => c.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = categoryOrder.find(c => c.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    } else {
      groupArray.sort((a, b) => a.category.localeCompare(b.category));
    }
  
  if (showSultanGroups) {
    groupArray.forEach(group => {
      const sultanMap = new Map();

      group.items.forEach(banknote => {
        const sultan = banknote.sultanName || 'Unknown';
        if (!sultanMap.has(sultan)) {
          sultanMap.set(sultan, []);
        }
        sultanMap.get(sultan).push(banknote);
      });

      group.sultanGroups = Array.from(sultanMap.entries())
        .map(([sultan, items]) => ({ sultan, items }))
        .sort((a, b) => {
          // Use database-driven order if available, fallback to default order
          if (sultanOrderMap) {
            const orderA = sultanOrderMap.get(a.sultan) ?? Number.MAX_SAFE_INTEGER;
            const orderB = sultanOrderMap.get(b.sultan) ?? Number.MAX_SAFE_INTEGER;
            
            // Debug logging
            console.log(`[Sultan Order Debug] Category: "${group.category}"`);
            console.log(`  Sultan: "${a.sultan}" -> Order: ${orderA} (from database: ${sultanOrderMap.has(a.sultan)})`);
            console.log(`  Sultan: "${b.sultan}" -> Order: ${orderB} (from database: ${sultanOrderMap.has(b.sultan)})`);
            console.log(`  Comparison result: ${orderA - orderB}`);
            
            return orderA - orderB;
          }
          
          // Fallback to default order
          const indexA = defaultSultanOrder.findIndex(name => name.toLowerCase() === a.sultan.toLowerCase());
          const indexB = defaultSultanOrder.findIndex(name => name.toLowerCase() === b.sultan.toLowerCase());
          
          console.log(`[Sultan Order Debug - Fallback] Category: "${group.category}"`);
          console.log(`  Sultan: "${a.sultan}" -> Default index: ${indexA}`);
          console.log(`  Sultan: "${b.sultan}" -> Default index: ${indexB}`);
          
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

      // Final order debug log
      console.log(`[Final Sultan Order] Category: "${group.category}" - Sultans in order:`, 
        group.sultanGroups.map(sg => sg.sultan));
    });
  }
  
    return groupArray;
  }, [banknotes, sortFields, categoryOrder, sultanOrderMap]);
};
