
import { useState, useEffect, useMemo } from "react";
import { Banknote, BanknoteFilterState } from "@/types";

interface UseBanknoteFilterProps<T> {
  items: T[];
  initialFilters?: Partial<BanknoteFilterState>;
}

interface GroupItem<T> {
  category: string;
  items: T[];
  sultanGroups?: { sultan: string; items: T[] }[];
}

interface UseBanknoteFilterResult<T> {
  filteredItems: T[];
  filters: BanknoteFilterState;
  setFilters: (filters: BanknoteFilterState) => void;
  availableCategories: { id: string; name: string; count: number }[];
  availableTypes: { id: string; name: string; count: number }[];
  groupedItems: GroupItem<T>[];
}

export const useBanknoteFilter = <T extends { banknote?: Banknote } | Banknote>({
  items,
  initialFilters = {},
}: UseBanknoteFilterProps<T>): UseBanknoteFilterResult<T> => {
  console.log("### useBanknoteFilter INITIALIZED ###");
  console.log(`Input items count: ${items.length}`);
  console.log("Initial filters:", initialFilters);

  const [filters, setFilters] = useState<BanknoteFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort || ["extPick"],
  });

  console.log("Initial state after setup:", {
    search: filters.search,
    selectedCategories: filters.categories,
    selectedTypes: filters.types,
    selectedSort: filters.sort,
  });

  // Extract banknote from item
  const getBanknote = (item: T): Banknote | undefined => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item as Banknote;
  };

  // Normalize types for consistent comparison
  const normalizeType = (type: string | undefined): string => {
    if (!type) return "";
    
    // Convert to lowercase for case-insensitive comparison
    const lowerType = type.toLowerCase();
    
    // Handle common variations of types
    if (lowerType.includes("issued") || lowerType === "issue") return "issued notes";
    if (lowerType.includes("specimen")) return "specimens";
    if (lowerType.includes("cancelled") || lowerType.includes("annule")) return "cancelled & annule";
    if (lowerType.includes("trial")) return "trial note";
    if (lowerType.includes("error")) return "error banknote";
    if (lowerType.includes("counterfeit")) return "counterfeit banknote";
    if (lowerType.includes("emergency")) return "emergency note";
    if (lowerType.includes("check") || lowerType.includes("bond")) return "check & bond notes";
    
    // Default case - return the original type if no match
    return lowerType;
  };

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    console.log("### FILTERING ITEMS ###");
    console.log("Current filters:", {
      search: filters.search,
      categories: filters.categories,
      types: filters.types,
      sort: filters.sort
    });
    
    // When no filters are selected, show all items
    const noCategories = filters.categories.length === 0;
    const noTypes = filters.types.length === 0;
    
    // If both categories and types are empty, return all items
    if (noCategories && noTypes && !filters.search) {
      console.log("No filters selected, returning all items");
      return items;
    }
    
    const filtered = items.filter((item) => {
      const banknote = getBanknote(item);
      if (!banknote) {
        return false;
      }
      
      const searchLower = filters.search.toLowerCase();

      // Search filter
      const matchesSearch = !filters.search || Object.values(banknote)
        .some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchLower)
        );

      // Category filter
      const matchesCategory = noCategories || 
        filters.categories.some(category => {
          return banknote.series && 
            banknote.series.toLowerCase() === category.toLowerCase();
        });

      // Type filter
      const normalizedItemType = normalizeType(banknote.type || "issued note");
      const matchesType = noTypes || 
        filters.types.some(type => {
          const normalizedFilterType = normalizeType(type);
          const isMatch = normalizedItemType === normalizedFilterType;
          return isMatch;
        });

      const result = matchesSearch && matchesCategory && matchesType;
      
      if (banknote.catalogId) {
        console.log(`Item ${banknote.catalogId} - Search: ${matchesSearch}, Category: ${matchesCategory}, Type: ${matchesType}, NormalizedType: ${normalizedItemType}`);
      }
      
      return result;
    });
    
    console.log(`Filtering complete: ${filtered.length} items matched out of ${items.length}`);
    
    // Sort the filtered items
    const sorted = [...filtered].sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);
      
      if (!banknoteA || !banknoteB) return 0;
      
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
          case "newest":
            if (a && b && 'createdAt' in a && 'createdAt' in b) {
              const dateA = new Date((a.createdAt as string) || "").getTime();
              const dateB = new Date((b.createdAt as string) || "").getTime();
              comparison = dateB - dateA;
            }
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
    
    console.log(`Sorting complete: ${sorted.length} items`);
    return sorted;
  }, [items, filters]);

  // Group items by category and optionally by sultan within category
  const groupedItems = useMemo(() => {
    console.log("### GROUPING ITEMS ###");
    const sortBySultan = filters.sort.includes("sultan");
    console.log(`Grouping by sultan: ${sortBySultan}`);
    
    const groups: GroupItem<T>[] = [];
    
    // Group filtered items by category
    const categoryMap = new Map<string, T[]>();
    filteredItems.forEach(item => {
      const banknote = getBanknote(item);
      if (!banknote || !banknote.series) return;
      
      const category = banknote.series;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(item);
    });
    
    console.log(`Found ${categoryMap.size} categories in filtered items`);
    
    // Add all categories in alphabetical order
    Array.from(categoryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, categoryItems]) => {
        if (!categoryItems || categoryItems.length === 0) return;
          
        console.log(`Processing category: ${category} with ${categoryItems.length} items`);
        
        const group: GroupItem<T> = { 
          category, 
          items: categoryItems,
        };
        
        // If sorting by sultan is enabled, group items by sultan within each category
        if (sortBySultan) {
          const sultanMap = new Map<string, T[]>();
          categoryItems.forEach(item => {
            const banknote = getBanknote(item);
            if (!banknote) return;
            
            const sultan = banknote.sultanName || "Unknown";
            if (!sultanMap.has(sultan)) {
              sultanMap.set(sultan, []);
            }
            sultanMap.get(sultan)?.push(item);
          });
          
          // Create sultan groups
          const sultanGroups = Array.from(sultanMap.entries())
            .map(([sultan, items]) => ({ sultan, items }))
            .sort((a, b) => a.sultan.localeCompare(b.sultan));
          
          console.log(`Category ${category} has ${sultanGroups.length} sultans`);
          sultanGroups.forEach(sg => {
            console.log(`  - Sultan ${sg.sultan}: ${sg.items.length} items`);
          });
          
          group.sultanGroups = sultanGroups;
        }
        
        groups.push(group);
      });
    
    console.log(`Grouping complete: ${groups.length} groups created`);
    return groups;
  }, [filteredItems, filters.sort]);

  // Calculate available categories and their counts
  const availableCategories = useMemo(() => {
    console.log("### CALCULATING AVAILABLE CATEGORIES ###");
    const categories = new Map<string, { name: string; count: number }>();
    
    items.forEach(item => {
      const banknote = getBanknote(item);
      if (banknote?.series) {
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

    const result = Array.from(categories.entries())
      .map(([id, { name, count }]) => ({ id, name, count }));
    
    console.log(`Found ${result.length} available categories`);
    result.forEach(cat => {
      console.log(`  - ${cat.name}: ${cat.count} items`);
    });
    
    return result;
  }, [items]);

  // Calculate available types and their counts
  const availableTypes = useMemo(() => {
    console.log("### CALCULATING AVAILABLE TYPES ###");
    const types = new Map<string, { name: string; count: number }>();
    
    // Define the default types
    const defaultTypes = [
      "Issued note",
      "Specimen",
      "Cancelled",
      "Trial note",
      "Error banknote",
      "Counterfeit banknote",
      "Emergency note",
      "Check & Bond notes",
      "Other notes"
    ];
    
    // Initialize with default types even if count is 0
    defaultTypes.forEach(type => {
      types.set(normalizeType(type), {
        name: type,
        count: 0
      });
    });
    
    // Count the actual types in items
    items.forEach(item => {
      const banknote = getBanknote(item);
      if (banknote) {
        // If type is not specified, assume it's an "Issued note"
        const typeToUse = banknote.type || "Issued note";
        const normalizedType = normalizeType(typeToUse);
        
        if (normalizedType) {
          if (!types.has(normalizedType)) {
            types.set(normalizedType, { 
              name: typeToUse, 
              count: 1 
            });
          } else {
            const current = types.get(normalizedType)!;
            types.set(normalizedType, { 
              ...current, 
              count: current.count + 1 
            });
          }
        }
      }
    });

    const result = Array.from(types.entries())
      .map(([id, { name, count }]) => ({ id, name, count }));
    
    console.log(`Found ${result.length} available types`);
    result.forEach(type => {
      console.log(`  - ${type.name}: ${type.count} items`);
    });
    
    return result;
  }, [items]);

  // Handle filter changes
  const handleFilterChange = (newFilters: BanknoteFilterState) => {
    console.log("### FILTER CHANGED ###");
    console.log("Old filters:", filters);
    console.log("New filters:", newFilters);
    setFilters(newFilters);
  };

  return {
    filteredItems,
    filters,
    setFilters: handleFilterChange,
    availableCategories,
    availableTypes,
    groupedItems,
  };
};
