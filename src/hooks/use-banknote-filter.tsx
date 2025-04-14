
import { useState, useEffect, useMemo } from "react";
import { Banknote, BanknoteFilterState } from "@/types";
import { SORT_OPTIONS } from "@/types";

interface UseBanknoteFilterProps<T> {
  items: T[];
  initialFilters?: Partial<BanknoteFilterState>;
}

interface UseBanknoteFilterResult<T> {
  filteredItems: T[];
  filters: BanknoteFilterState;
  setFilters: (filters: BanknoteFilterState) => void;
  availableCategories: { id: string; name: string; count: number }[];
  availableTypes: { id: string; name: string; count: number }[];
}

export const useBanknoteFilter = <T extends { banknote?: Banknote } | Banknote>({
  items,
  initialFilters = {},
}: UseBanknoteFilterProps<T>): UseBanknoteFilterResult<T> => {
  const [filters, setFilters] = useState<BanknoteFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort || ["extPick"],
  });

  // Extract banknote from item
  const getBanknote = (item: T): Banknote => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item as Banknote;
  };

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const banknote = getBanknote(item);
      const searchLower = filters.search.toLowerCase();

      // Search filter
      const matchesSearch = !filters.search || Object.values(banknote)
        .some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchLower)
        );

      // Category filter
      const matchesCategory = filters.categories.length === 0 ||
        (banknote.series && filters.categories.includes(banknote.series));

      // Type filter
      const matchesType = filters.types.length === 0 ||
        (banknote.type && filters.types.includes(banknote.type));

      return matchesSearch && matchesCategory && matchesType;
    }).sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);

      // Apply sorting based on selected criteria
      for (const sortOption of filters.sort) {
        let comparison = 0;

        switch (sortOption) {
          case "sultan":
            comparison = (banknoteA.sultanName || "")
              .localeCompare(banknoteB.sultanName || "");
            break;

          case "faceValue":
            const valueA = banknoteA.denomination || "";
            const valueB = banknoteB.denomination || "";
            const isKurushA = valueA.toLowerCase().includes("kurush");
            const isKurushB = valueB.toLowerCase().includes("kurush");
            const isLiraA = valueA.toLowerCase().includes("lira");
            const isLiraB = valueB.toLowerCase().includes("lira");

            if (isKurushA && isLiraB) comparison = -1;
            else if (isLiraA && isKurushB) comparison = 1;
            else {
              const numA = parseFloat(valueA.replace(/[^0-9.]/g, "")) || 0;
              const numB = parseFloat(valueB.replace(/[^0-9.]/g, "")) || 0;
              comparison = numA - numB;
            }
            break;

          case "extPick":
            comparison = (banknoteA.extendedPickNumber || banknoteA.catalogId || "")
              .localeCompare(banknoteB.extendedPickNumber || banknoteB.catalogId || "");
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
  }, [items, filters]);

  // Calculate available categories and their counts
  const availableCategories = useMemo(() => {
    const categories = new Map<string, { name: string; count: number }>();
    
    items.forEach(item => {
      const banknote = getBanknote(item);
      if (banknote.series) {
        if (!categories.has(banknote.series)) {
          categories.set(banknote.series, { 
            name: banknote.series, 
            count: 1 
          });
        } else {
          const current = categories.get(banknote.series)!;
          categories.set(banknote.series, { 
            ...current, 
            count: current.count + 1 
          });
        }
      }
    });

    return Array.from(categories.entries())
      .map(([id, { name, count }]) => ({ id, name, count }));
  }, [items]);

  // Calculate available types and their counts
  const availableTypes = useMemo(() => {
    const types = new Map<string, { name: string; count: number }>();
    
    items.forEach(item => {
      const banknote = getBanknote(item);
      if (banknote.type) {
        if (!types.has(banknote.type)) {
          types.set(banknote.type, { 
            name: banknote.type, 
            count: 1 
          });
        } else {
          const current = types.get(banknote.type)!;
          types.set(banknote.type, { 
            ...current, 
            count: current.count + 1 
          });
        }
      }
    });

    return Array.from(types.entries())
      .map(([id, { name, count }]) => ({ id, name, count }));
  }, [items]);

  return {
    filteredItems,
    filters,
    setFilters,
    availableCategories,
    availableTypes,
  };
};
