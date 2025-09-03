
import { useMemo } from "react";
import { DetailedBanknote } from "@/types";
import { getSultanOrderMap, getSultanOrder } from "@/services/sultanOrderService";

interface CategoryOrder {
  name: string;
  name_ar?: string;
  name_tr?: string;
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
        // Find the category definition to get translation fields
        const categoryDef = categoryOrder.find(cat => cat.name === category);
        
        categoryMap.set(category, {
          category,
          category_ar: categoryDef?.name_ar,
          category_tr: categoryDef?.name_tr,
          categoryId: '',
          items: []
        });
      }
  
      categoryMap.get(category).items.push(banknote);
    });
  
    const groupArray = Array.from(categoryMap.values());
  
    // Sort categories by their defined order from categoryOrder parameter
    const sortedGroups = groupArray.sort((a, b) => {
      const aOrder = categoryOrder.find(cat => cat.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrder.find(cat => cat.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
      

      
      return aOrder - bOrder;
    });
    

  
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
            const orderA = getSultanOrder(a.sultan, sultanOrderMap);
            const orderB = getSultanOrder(b.sultan, sultanOrderMap);
            

            return orderA - orderB;
          }
          
          // Fallback to default order
          const indexA = defaultSultanOrder.findIndex(name => name.toLowerCase() === a.sultan.toLowerCase());
          const indexB = defaultSultanOrder.findIndex(name => name.toLowerCase() === b.sultan.toLowerCase());
          

          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });


    });
  }
  
    return sortedGroups;
  }, [banknotes, sortFields, categoryOrder, sultanOrderMap]);
};
