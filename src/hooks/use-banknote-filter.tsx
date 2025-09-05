
import { useState, useEffect, useMemo, useCallback } from "react";
import { Banknote } from "@/types";
import { DynamicFilterState } from "@/types/filter";

interface UseBanknoteFilterProps<T> {
  items: T[];
  initialFilters?: Partial<DynamicFilterState>;
  sultanOrderMap?: Map<string, number>;
}

interface GroupItem<T> {
  category: string;
  items: T[];
  sultanGroups?: { 
    sultan: string; 
    sultan_ar?: string; 
    sultan_tr?: string; 
    items: T[] 
  }[];
}

interface UseBanknoteFilterResult<T> {
  filteredItems: T[];
  filters: DynamicFilterState;
  setFilters: (filters: Partial<DynamicFilterState>) => void;
  availableCategories: { id: string; name: string; count: number }[];
  availableTypes: { id: string; name: string; count: number }[];
  groupedItems: GroupItem<T>[];
}

export const useBanknoteFilter = <T extends { banknote?: Banknote } | Banknote>({
  items,
  initialFilters = {},
  sultanOrderMap,
}: UseBanknoteFilterProps<T>): UseBanknoteFilterResult<T> => {


  const [filters, setFilters] = useState<DynamicFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort !== undefined ? initialFilters.sort : ["extPick"],
  });



  // Extract banknote from item safely
  const getBanknote = useCallback((item: T | undefined | null): Banknote | undefined => {
    if (!item) return undefined;
    
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item as Banknote;
  }, []);

  // Normalize types for consistent comparison
  const normalizeType = useCallback((type: string | undefined): string => {
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
  }, []);

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    
    // Ensure items array exists
    const validItems = items || [];
    

    
    // When no filters are selected, show all items
    const noCategories = !filters.categories || filters.categories.length === 0;
    const noTypes = !filters.types || filters.types.length === 0;
    const noCountries = !filters.countries || filters.countries.length === 0;
    
    let filtered;
    
    // If no filtering criteria at all, use all items but still apply sorting
    if (noCategories && noTypes && noCountries && !filters.search) {
      filtered = validItems;
    } else {
      // Apply filtering criteria
      filtered = validItems.filter((item) => {
      const banknote = getBanknote(item);
      if (!banknote) {
        return false;
      }
      
      // Fix for the TypeError: ensure search term is defined before using toLowerCase()
      const searchLower = (filters.search || "").toLowerCase();

      // Search filter
      const matchesSearch = !filters.search || Object.values(banknote)
        .filter(value => value !== null && value !== undefined && typeof value === 'string')
        .some(value => 
          (value as string).toLowerCase().includes(searchLower)
        );

      // Category filter - initially show all items when filter is empty
      let matchesCategory = noCategories;
      
      // If series exists and categories are selected, check match
      if (!noCategories && banknote.series) {
        // Create a normalized version of the series for comparison
        const seriesId = banknote.series.toLowerCase().replace(/\s+/g, '-');
        
        // Try to match by direct ID first, then by series name (case-insensitive)
        matchesCategory = filters.categories.some(category => 
          category === seriesId || 
          category.toLowerCase() === seriesId ||
          banknote.series?.toLowerCase() === category.toLowerCase()
        );
      }

      // Type filter - ensure we have valid types before comparison
      const normalizedItemType = normalizeType(banknote.type || "issued note");
      
      // Initial assume no match if filter is applied
      let matchesType = noTypes;
      
      // If filters exist, check for matches
      if (!noTypes) {
        // Try direct match first
        matchesType = filters.types.some(type => {
          // Try direct match by ID or normalized comparison
          return type.toLowerCase() === normalizedItemType || 
                 normalizeType(type) === normalizedItemType;
        });
      }

      // Country filter - for marketplace items
      const noCountries = !filters.countries || filters.countries.length === 0;
      let matchesCountry = noCountries;
      
      if (!noCountries && banknote.country) {
        // Create a normalized version of the country for comparison
        const countryId = banknote.country.toLowerCase().replace(/\s+/g, '-');
        
        // Try to match by direct ID first, then by country name (case-insensitive)
        matchesCountry = filters.countries.some(country => 
          country === countryId || 
          country.toLowerCase() === countryId ||
          banknote.country?.toLowerCase() === country.toLowerCase()
        );
      }

      const result = matchesSearch && matchesCategory && matchesType && matchesCountry;
      
     
      
      return result;
      });
    }
    
    
    // Sort the filtered items
    const sorted = [...filtered].sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);
      
      if (!banknoteA || !banknoteB) return 0;
      
      // Apply sorting based on selected criteria
      for (const sortOption of filters.sort || []) {
        let comparison = 0;

        switch (sortOption) {
          case "sultan":
            comparison = ((banknoteA.sultanName || "")
              .localeCompare(banknoteB.sultanName || ""));
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
            comparison = ((banknoteA.extendedPickNumber || banknoteA.catalogId || "")
              .localeCompare(banknoteB.extendedPickNumber || banknoteB.catalogId || ""));
            break;
          case "newest":
            if (a && b && 'createdAt' in a && 'createdAt' in b) {
              const dateA = new Date((a.createdAt as string) || "").getTime();
              const dateB = new Date((b.createdAt as string) || "").getTime();
              comparison = dateB - dateA; // newest first
            } else if (a && b && 'created_at' in a && 'created_at' in b) {
              // Handle marketplace items with created_at field
              const dateA = new Date((a as any).created_at || "").getTime();
              const dateB = new Date((b as any).created_at || "").getTime();
              comparison = dateB - dateA; // newest first
            }
            break;
          case "oldest":
            if (a && b && 'createdAt' in a && 'createdAt' in b) {
              const dateA = new Date((a.createdAt as string) || "").getTime();
              const dateB = new Date((b.createdAt as string) || "").getTime();
              comparison = dateA - dateB; // oldest first
            } else if (a && b && 'created_at' in a && 'created_at' in b) {
              // Handle marketplace items with created_at field
              const dateA = new Date((a as any).created_at || "").getTime();
              const dateB = new Date((b as any).created_at || "").getTime();
              comparison = dateA - dateB; // oldest first
            }
            break;
          case "priceHighToLow":
            // Sort by price (high to low) for marketplace items
            if (a && b && 'collectionItem' in a && 'collectionItem' in b) {
              const priceA = parseFloat((a as any).collectionItem?.salePrice || "0");
              const priceB = parseFloat((b as any).collectionItem?.salePrice || "0");
              comparison = priceB - priceA; // high to low
            }
            break;
          case "priceLowToHigh":
            // Sort by price (low to high) for marketplace items
            if (a && b && 'collectionItem' in a && 'collectionItem' in b) {
              const priceA = parseFloat((a as any).collectionItem?.salePrice || "0");
              const priceB = parseFloat((b as any).collectionItem?.salePrice || "0");
              comparison = priceA - priceB; // low to high
            }
            break;
          case "country":
            // Add country sorting
            const countryA = banknoteA.country || "";
            const countryB = banknoteB.country || "";
            comparison = countryA.localeCompare(countryB);
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
    
    return sorted;
  }, [items, filters, getBanknote, normalizeType]);

  // Group items by category and optionally by sultan within category
  const groupedItems = useMemo(() => {
    const sortBySultan = filters.sort?.includes("sultan") || false;
    
    const groups: GroupItem<T>[] = [];
    
    // Ensure we have items to group
    if (!filteredItems || filteredItems.length === 0) {
      return groups;
    }
    
    // Group filtered items by category
    const categoryMap = new Map<string, T[]>();
    filteredItems.forEach(item => {
      const banknote = getBanknote(item);
      // Make sure banknote and series exist before using them
      if (!banknote || !banknote.series) return;
      
      const category = banknote.series;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(item);
    });
    
    
    // Add all categories in database order (no sorting to respect display_order)
    // This ensures consistent category ordering across all users regardless of their filter preferences
    // User preferences only affect item sorting within categories, not category order itself
    Array.from(categoryMap.entries())
      .forEach(([category, categoryItems]) => {
        if (!categoryItems || categoryItems.length === 0) return;
          
        
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
            .sort((a, b) => {
              
              
              // Use database-driven order if available, fallback to alphabetical
              if (sultanOrderMap) {
                const orderA = sultanOrderMap.get(a.sultan) ?? Number.MAX_SAFE_INTEGER;
                const orderB = sultanOrderMap.get(b.sultan) ?? Number.MAX_SAFE_INTEGER;
                
           
                
                return orderA - orderB;
              }
              
              // Fallback to alphabetical sorting
              const alphaResult = a.sultan.localeCompare(b.sultan);
              return alphaResult;
            });
          
          
          
          group.sultanGroups = sultanGroups;
        }
        
        groups.push(group);
      });
    
    
    return groups;
  }, [filteredItems, filters.sort, getBanknote]);

  // Calculate available categories and their counts
  const availableCategories = useMemo(() => {
    const categories = new Map<string, { name: string; count: number }>();
    
    // Ensure items array exists
    const validItems = items || [];
    
    validItems.forEach(item => {
      const banknote = getBanknote(item);
      // Make sure banknote and series exist before using them
      if (banknote?.series) {
        const seriesId = banknote.series.toLowerCase().replace(/\s+/g, '-');
        if (!categories.has(seriesId)) {
          categories.set(seriesId, { 
            name: banknote.series, 
            count: 1 
          });
        } else {
          const current = categories.get(seriesId)!;
          categories.set(seriesId, { 
            ...current, 
            count: current.count + 1 
          });
        }
      }
    });

    const result = Array.from(categories.entries())
      .map(([id, { name, count }]) => ({ id, name, count }));
    
    
    
    return result;
  }, [items, getBanknote]);

  // Calculate available types and their counts
  const availableTypes = useMemo(() => {
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
      const normalizedType = normalizeType(type);
      types.set(normalizedType, {
        name: type,
        count: 0
      });
    });
    
    // Ensure items array exists
    const validItems = items || [];
    
    // Count the actual types in items
    validItems.forEach(item => {
      const banknote = getBanknote(item);
      if (banknote) {
        // If type is not specified, assume it's an "Issued note"
        const typeToUse = banknote.type || "Issued note";
        const normalizedType = normalizeType(typeToUse);
        
        if (normalizedType) {
          const typeId = normalizedType.toLowerCase().replace(/\s+/g, '-');
          if (!types.has(typeId)) {
            types.set(typeId, { 
              name: typeToUse, 
              count: 1 
            });
          } else {
            const current = types.get(typeId)!;
            types.set(typeId, { 
              ...current, 
              count: current.count + 1 
            });
          }
        }
      }
    });

    const result = Array.from(types.entries())
      .map(([typeId, { name, count }]) => ({ id: typeId, name, count }))
      .filter(type => type.count > 0 || defaultTypes.some(dt => 
        normalizeType(dt) === type.id));
    
 
    
    return result;
  }, [items, getBanknote, normalizeType]);

  // Handle filter changes - memoize to prevent unnecessary re-renders
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {

    
    // Detect if there's a real change to avoid unnecessary state updates
    let hasChanged = false;
    
    if (newFilters.search !== undefined && newFilters.search !== filters.search) {
      hasChanged = true;
    }
    
    if (newFilters.categories !== undefined) {
      if (!filters.categories || 
          newFilters.categories.length !== filters.categories.length ||
          !newFilters.categories.every(c => filters.categories?.includes(c))) {
        hasChanged = true;
      }
    }
    
    if (newFilters.types !== undefined) {
      if (!filters.types || 
          newFilters.types.length !== filters.types.length ||
          !newFilters.types.every(t => filters.types?.includes(t))) {
        hasChanged = true;
      }
    }
    
    if (newFilters.sort !== undefined) {
      if (!filters.sort || 
          newFilters.sort.length !== filters.sort.length ||
          !newFilters.sort.every(s => filters.sort?.includes(s))) {
        hasChanged = true;
      }
    }
    
    if (newFilters.countries !== undefined) {
      if (!filters.countries || 
          newFilters.countries.length !== filters.countries.length ||
          !newFilters.countries.every(c => filters.countries?.includes(c))) {
        hasChanged = true;
      }
    }
    
    if (hasChanged) {
      setFilters(prevFilters => ({
        ...prevFilters,
        ...newFilters,
      }));
    } else {
      console.log("No actual filter change detected, skipping update");
    }
  }, [filters]);

  return {
    filteredItems,
    filters,
    setFilters: handleFilterChange,
    availableCategories,
    availableTypes,
    groupedItems,
  };
};
