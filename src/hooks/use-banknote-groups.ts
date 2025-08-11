
import { useMemo } from "react";
import { DetailedBanknote } from "@/types";
import { getSultanOrderMap, getSultanOrder } from "@/services/sultanOrderService";

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
  
    // Sort categories by their defined order from categoryOrder parameter
    const sortedGroups = groupArray.sort((a, b) => {
      const aOrder = categoryOrder.find(cat => cat.name === a.category)?.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = categoryOrder.find(cat => cat.name === b.category)?.order ?? Number.MAX_SAFE_INTEGER;
      
      console.log(`\n🔄 [Category Sorting Debug] Comparing categories:`);
      console.log(`  Category A: "${a.category}" -> Order: ${aOrder}`);
      console.log(`  Category B: "${b.category}" -> Order: ${bOrder}`);
      console.log(`  Comparison result: ${aOrder - bOrder}`);
      
      return aOrder - bOrder;
    });
    
    console.log(`\n✅ [useBanknoteGroups Debug] Categories after explicit sorting:`, 
      sortedGroups.map((g, i) => `${i + 1}. "${g.category}" (order: ${categoryOrder.find(cat => cat.name === g.category)?.order ?? 'undefined'})`));
  
  if (showSultanGroups) {
    groupArray.forEach(group => {
      console.log(`\n🔍 [Sultan Grouping Debug] Processing category: "${group.category}"`);
      
      const sultanMap = new Map();

      group.items.forEach(banknote => {
        const sultan = banknote.sultanName || 'Unknown';
        if (!sultanMap.has(sultan)) {
          sultanMap.set(sultan, []);
        }
        sultanMap.get(sultan).push(banknote);
      });

      console.log(`📊 [Sultan Grouping Debug] Found sultans in category "${group.category}":`, 
        Array.from(sultanMap.keys()));

      group.sultanGroups = Array.from(sultanMap.entries())
        .map(([sultan, items]) => ({ sultan, items }))
        .sort((a, b) => {
          console.log(`\n🔄 [Sultan Sorting Debug] Comparing sultans in category "${group.category}":`);
          console.log(`  Sultan A: "${a.sultan}" (${a.items.length} items)`);
          console.log(`  Sultan B: "${b.sultan}" (${b.items.length} items)`);
          
          // Use database-driven order if available, fallback to default order
          if (sultanOrderMap) {
            const orderA = getSultanOrder(a.sultan, sultanOrderMap);
            const orderB = getSultanOrder(b.sultan, sultanOrderMap);
            
            console.log(`  📋 Database Order:`);
            console.log(`    "${a.sultan}" -> Order: ${orderA} (using helper function)`);
            console.log(`    "${b.sultan}" -> Order: ${orderB} (using helper function)`);
            console.log(`    Comparison result: ${orderA - orderB}`);
            
            return orderA - orderB;
          }
          
          // Fallback to default order
          const indexA = defaultSultanOrder.findIndex(name => name.toLowerCase() === a.sultan.toLowerCase());
          const indexB = defaultSultanOrder.findIndex(name => name.toLowerCase() === b.sultan.toLowerCase());
          
          console.log(`  📋 Default Order (fallback):`);
          console.log(`    "${a.sultan}" -> Default index: ${indexA}`);
          console.log(`    "${b.sultan}" -> Default index: ${indexB}`);
          console.log(`    Comparison result: ${(indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB)}`);
          
          return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
        });

      // Final order debug log
      console.log(`\n✅ [Final Sultan Order] Category: "${group.category}" - Final sultan order:`, 
        group.sultanGroups.map((sg, index) => `${index + 1}. ${sg.sultan} (${sg.items.length} items)`));
    });
  }
  
    return sortedGroups;
  }, [banknotes, sortFields, categoryOrder, sultanOrderMap]);
};
