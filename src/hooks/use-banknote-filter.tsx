
import { useState, useEffect, useMemo } from "react";
import { Banknote, CollectionItem, WishlistItem, DetailedBanknote } from "@/types";

type FilterableItem = Banknote | DetailedBanknote | { banknote: Banknote };

export interface BanknoteFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
}

interface UseBanknoteFilterProps<T extends FilterableItem> {
  items: T[];
  initialFilters?: Partial<BanknoteFilterState>;
}

interface UseBanknoteFilterResult<T extends FilterableItem> {
  filteredItems: T[];
  filters: BanknoteFilterState;
  setFilters: (filters: BanknoteFilterState) => void;
  availableCategories: { id: string; name: string; count: number }[];
  availableTypes: { id: string; name: string; count: number }[];
}

export const useBanknoteFilter = <T extends FilterableItem>({
  items,
  initialFilters = {},
}: UseBanknoteFilterProps<T>): UseBanknoteFilterResult<T> => {
  const [filters, setFilters] = useState<BanknoteFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort || ["extPick"],
  });

  // Extract banknote from the item
  const getBanknote = (item: T): Banknote => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item as Banknote;
  };

  // Extract categories and types from the items
  const { availableCategories, availableTypes } = useMemo(() => {
    const categoryMap = new Map<string, { name: string; count: number }>();
    const typeMap = new Map<string, { name: string; count: number }>();

    items.forEach((item) => {
      const banknote = getBanknote(item);
      
      // Handle categories
      if (banknote.series) {
        if (!categoryMap.has(banknote.series)) {
          categoryMap.set(banknote.series, { name: banknote.series, count: 1 });
        } else {
          const current = categoryMap.get(banknote.series)!;
          categoryMap.set(banknote.series, { ...current, count: current.count + 1 });
        }
      }
      
      // Handle types
      if (banknote.type) {
        if (!typeMap.has(banknote.type)) {
          typeMap.set(banknote.type, { name: banknote.type, count: 1 });
        } else {
          const current = typeMap.get(banknote.type)!;
          typeMap.set(banknote.type, { ...current, count: current.count + 1 });
        }
      }
    });
    
    return {
      availableCategories: Array.from(categoryMap.entries()).map(([id, { name, count }]) => ({ 
        id, name, count 
      })),
      availableTypes: Array.from(typeMap.entries()).map(([id, { name, count }]) => ({ 
        id, name, count 
      })),
    };
  }, [items]);

  // Filter items based on search, categories, and types
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const banknote = getBanknote(item);
      const searchLower = filters.search.toLowerCase();
      
      // Search filter
      const matchesSearch = !filters.search || 
        Object.entries(banknote).some(([key, value]) => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower);
          }
          return false;
        });
      
      // Category filter
      const matchesCategory = 
        filters.categories.length === 0 || // If no categories selected, show all
        (banknote.series && filters.categories.includes(banknote.series));
      
      // Type filter
      const matchesType = 
        filters.types.length === 0 || // If no types selected, show all
        (banknote.type && filters.types.includes(banknote.type));
      
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [items, filters]);

  // Sort the filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);
      
      // Apply sorting based on the selected sort options
      for (const sortOption of filters.sort) {
        let comparison = 0;
        
        switch (sortOption) {
          case "sultan":
            // Sort by sultan name
            comparison = (banknoteA.sultanName || "").localeCompare(banknoteB.sultanName || "");
            break;
            
          case "faceValue":
            // Sort by face value with currency hierarchy (Kurush < Lira)
            const valueA = banknoteA.denomination || "";
            const valueB = banknoteB.denomination || "";
            
            // Check if Kurush vs Lira
            const isKurushA = valueA.toLowerCase().includes("kurush");
            const isKurushB = valueB.toLowerCase().includes("kurush");
            const isLiraA = valueA.toLowerCase().includes("lira");
            const isLiraB = valueB.toLowerCase().includes("lira");
            
            if (isKurushA && isLiraB) {
              comparison = -1;
            } else if (isLiraA && isKurushB) {
              comparison = 1;
            } else {
              // Same currency type, compare numeric values
              const numValueA = parseFloat(valueA.replace(/[^0-9.]/g, "")) || 0;
              const numValueB = parseFloat(valueB.replace(/[^0-9.]/g, "")) || 0;
              comparison = numValueA - numValueB;
            }
            break;
            
          case "extPick":
            // Sort by extended pick number
            const pickA = banknoteA.extendedPickNumber || banknoteA.catalogId || "";
            const pickB = banknoteB.extendedPickNumber || banknoteB.catalogId || "";
            comparison = pickA.localeCompare(pickB);
            break;
            
          case "year":
            // Sort by year
            comparison = (banknoteA.year || "").localeCompare(banknoteB.year || "");
            break;
            
          case "newest":
            // Sort by created date if available
            const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
            const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
            comparison = dateB - dateA; // Newest first
            break;
            
          case "oldest":
            // Sort by created date if available
            const dateOldA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
            const dateOldB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
            comparison = dateOldA - dateOldB; // Oldest first
            break;
        }
        
        // If we found a difference, return it
        if (comparison !== 0) {
          return comparison;
        }
      }
      
      return 0;
    });
  }, [filteredItems, filters.sort]);

  return {
    filteredItems: sortedItems,
    filters,
    setFilters,
    availableCategories,
    availableTypes,
  };
};
