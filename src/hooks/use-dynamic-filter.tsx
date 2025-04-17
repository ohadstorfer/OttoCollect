
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { DynamicFilterState, FilterableItem } from "@/types/filter";
import { fetchUserFilterPreferences } from "@/services/countryService";

interface UseDynamicFilterProps<T extends FilterableItem> {
  items: T[];
  initialFilters?: Partial<DynamicFilterState>;
  countryId?: string;
  categories?: { id: string; name: string; count?: number }[];
  types?: { id: string; name: string; count?: number }[];
  sortOptions?: { id: string; name: string; field_name: string; is_required: boolean }[];
  collectionCategories?: { id: string; name: string; count?: number }[];
  collectionTypes?: { id: string; name: string; count?: number }[];
}

interface GroupItem<T> {
  category: string;
  categoryId: string;
  items: T[];
  sultanGroups?: { sultan: string; items: T[] }[];
}

interface UseDynamicFilterResult<T> {
  filteredItems: T[];
  filters: DynamicFilterState;
  setFilters: (filters: Partial<DynamicFilterState>) => void;
  groupedItems: GroupItem<T>[];
  isLoading: boolean;
}

export const useDynamicFilter = <T extends FilterableItem>({
  items,
  initialFilters = {},
  countryId,
  categories = [],
  types = [],
  sortOptions = [],
  collectionCategories = [],
  collectionTypes = [],
}: UseDynamicFilterProps<T>): UseDynamicFilterResult<T> => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;
  const isMounted = useRef(true);
  const isUpdatingFilters = useRef(false);
  const filtersRef = useRef<DynamicFilterState | null>(null);
  const preferencesLoaded = useRef(false); // Track if preferences were loaded
  
  console.log("useDynamicFilter: Initialize with", { 
    itemsCount: items.length, 
    countryId, 
    userId, 
    initialFilters 
  });
  
  // Use categories from props or collection props
  const effectiveCategories = useMemo(() => {
    return categories.length > 0 ? categories : collectionCategories;
  }, [categories, collectionCategories]);
  
  // Use types from props or collection props
  const effectiveTypes = useMemo(() => {
    return types.length > 0 ? types : collectionTypes;
  }, [types, collectionTypes]);
  
  // Determine default sort options
  const defaultSortFields = useMemo(() => {
    const fields = sortOptions
      .filter(option => option.is_required)
      .map(option => option.field_name);
    
    console.log("useDynamicFilter: Default sort fields", fields);
    return fields.length > 0 ? fields : ["extPick"];
  }, [sortOptions]);

  const [filters, setFiltersState] = useState<DynamicFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort || defaultSortFields,
    country_id: countryId
  });

  // Update filters when countryId changes
  useEffect(() => {
    if (countryId && !isUpdatingFilters.current) {
      console.log("useDynamicFilter: Updating filters with new countryId:", countryId);
      isUpdatingFilters.current = true;
      
      setFiltersState(prev => ({
        ...prev,
        country_id: countryId
      }));
      
      setTimeout(() => {
        isUpdatingFilters.current = false;
      }, 100);
    }
  }, [countryId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!countryId) {
        console.log("useDynamicFilter: No countryId, skipping preferences load");
        setIsLoading(false);
        return;
      }

      // Skip if we've already loaded preferences for this countryId
      if (preferencesLoaded.current && filters.country_id === countryId) {
        console.log("useDynamicFilter: Preferences already loaded for this countryId");
        setIsLoading(false);
        return;
      }

      console.log("useDynamicFilter: Loading preferences for", { userId, countryId });
      try {
        setIsLoading(true);
        
        // Set default values first (will be overridden by user preferences if they exist)
        const defaultCategoryIds = effectiveCategories?.map(cat => cat.id) || [];
        const defaultTypeIds = effectiveTypes
          ?.filter(type => type.name.toLowerCase().includes('issued'))
          .map(type => type.id) || [];
          
        const requiredSortFields = sortOptions
          .filter(option => option.is_required)
          .map(option => option.field_name);
        
        console.log("useDynamicFilter: Default values", {
          defaultCategoryIds,
          defaultTypeIds,
          requiredSortFields
        });
          
        // Try to load user preferences
        let userPrefs = null;
        if (userId) {
          try {
            userPrefs = await fetchUserFilterPreferences(userId, countryId);
            console.log("useDynamicFilter: Loaded user preferences", userPrefs);
          } catch (error) {
            console.error("useDynamicFilter: Error loading user preferences", error);
            // Continue with defaults
          }
        } else {
          console.log("useDynamicFilter: No userId, skipping preference fetch");
        }
        
        if (!isMounted.current) return;
        
        if (userPrefs) {
          // Map IDs to field names for sort options
          const sortFieldNames = userPrefs.selected_sort_options
            .map(sortId => {
              const option = sortOptions.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          // Ensure required sort fields are included
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
          // Only update state if component is still mounted and we're not already updating
          if (isMounted.current && !isUpdatingFilters.current) {
            console.log("useDynamicFilter: Setting filters from user preferences", {
              categories: userPrefs.selected_categories,
              types: userPrefs.selected_types,
              sort: finalSortFields
            });
            
            isUpdatingFilters.current = true;
            
            const newFilters = {
              ...filters,
              categories: userPrefs.selected_categories.length > 0 ? userPrefs.selected_categories : defaultCategoryIds,
              types: userPrefs.selected_types.length > 0 ? userPrefs.selected_types : defaultTypeIds,
              sort: finalSortFields.length > 0 ? finalSortFields : defaultSortFields,
              country_id: countryId // Ensure countryId is set correctly
            };
            
            console.log("useDynamicFilter: New filters from preferences", newFilters);
            setFiltersState(newFilters);
            filtersRef.current = newFilters;
            preferencesLoaded.current = true; // Mark preferences as loaded
            
            setTimeout(() => {
              isUpdatingFilters.current = false;
            }, 100);
          }
        } else {
          // Set defaults if no preferences found
          if (isMounted.current && !isUpdatingFilters.current) {
            console.log("useDynamicFilter: Setting default filters");
            isUpdatingFilters.current = true;
            
            const newFilters = {
              ...filters,
              categories: defaultCategoryIds,
              types: defaultTypeIds.length > 0 ? defaultTypeIds : effectiveTypes?.map(t => t.id) || [],
              sort: requiredSortFields.length > 0 ? requiredSortFields : defaultSortFields,
              country_id: countryId // Ensure countryId is set correctly
            };
            
            console.log("useDynamicFilter: Default filters set", newFilters);
            setFiltersState(newFilters);
            filtersRef.current = newFilters;
            preferencesLoaded.current = true; // Mark preferences as loaded
            
            setTimeout(() => {
              isUpdatingFilters.current = false;
            }, 100);
          }
        }
      } catch (error) {
        console.error("useDynamicFilter: Error in loadUserPreferences", error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    loadUserPreferences();
  }, [userId, countryId, effectiveCategories, effectiveTypes, sortOptions, defaultSortFields, filters]);

  // Handle filter changes 
  const setFilters = useCallback((changes: Partial<DynamicFilterState>) => {
    if (isUpdatingFilters.current) {
      console.log("useDynamicFilter: setFilters skipped - update already in progress");
      return;
    }
    
    console.log("useDynamicFilter: setFilters called with", changes);
    isUpdatingFilters.current = true;
    
    const newFilters = { 
      ...filters, 
      ...changes,
      // Always ensure country_id is properly set
      country_id: changes.country_id || filters.country_id || countryId
    };
    
    console.log("useDynamicFilter: New filters", newFilters);
    
    if (!isMounted.current) {
      console.log("useDynamicFilter: Component unmounted, skipping state update");
      return;
    }
    
    setFiltersState(newFilters);
    filtersRef.current = newFilters;
    
    setTimeout(() => {
      isUpdatingFilters.current = false;
    }, 100);
  }, [filters, countryId]);

  // Extract banknote from item
  const getBanknote = useCallback((item: T): any => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item;
  }, []);

  // Create a map of category IDs to names for quick lookups
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveCategories.forEach(cat => {
      map.set(cat.id, cat.name);
    });
    return map;
  }, [effectiveCategories]);

  // Create a map of type IDs to names for quick lookups
  const typeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveTypes.forEach(type => {
      map.set(type.id, type.name);
    });
    return map;
  }, [effectiveTypes]);

  // Create reverse maps for looking up IDs by name
  const categoryIdByNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveCategories.forEach(cat => {
      map.set(cat.name.toLowerCase(), cat.id);
    });
    return map;
  }, [effectiveCategories]);

  const typeIdByNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveTypes.forEach(type => {
      map.set(normalizeType(type.name), type.id);
    });
    return map;
  }, [effectiveTypes]);

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    console.log("useDynamicFilter: Filtering items", { 
      itemsCount: items.length, 
      filters: filtersRef.current || filters,
      isLoading
    });
    
    // When loading, return empty array
    if (isLoading) {
      console.log("useDynamicFilter: Still loading, returning empty array");
      return [];
    }
    
    // Use the most recent filters (from ref or state)
    const currentFilters = filtersRef.current || filters;
    
    // When no filters are selected, show all items
    const noCategories = !currentFilters.categories || currentFilters.categories.length === 0;
    const noTypes = !currentFilters.types || currentFilters.types.length === 0;
    
    console.log("useDynamicFilter: Filter status", { 
      noCategories, 
      noTypes, 
      categoryFilters: currentFilters.categories,
      typeFilters: currentFilters.types
    });
    
    // Safety check for items array
    if (!items || !Array.isArray(items)) {
      console.log("useDynamicFilter: Items is not an array, returning empty array");
      return [];
    }
    
    // Convert selected category IDs to names for comparison
    const selectedCategoryNames = currentFilters.categories
      .map(id => categoryNameMap.get(id))
      .filter(Boolean)
      .map(name => name.toLowerCase());
    
    // Convert selected type IDs to normalized names for comparison
    const selectedTypeNames = currentFilters.types
      .map(id => typeNameMap.get(id))
      .filter(Boolean)
      .map(name => normalizeType(name));
    
    // Log the names for debugging
    if (selectedCategoryNames.length > 0) {
      console.log("useDynamicFilter: Selected category names:", selectedCategoryNames);
    }
    if (selectedTypeNames.length > 0) {
      console.log("useDynamicFilter: Selected type names:", selectedTypeNames);
    }
    
    // DEBUG: Log first few items to see their structure
    if (items.length > 0) {
      const sampleBanknote = getBanknote(items[0]);
      console.log("Sample banknote data:", {
        id: sampleBanknote.id,
        category: sampleBanknote.category,
        type: sampleBanknote.type,
        series: sampleBanknote.series,
        categoryId: sampleBanknote.categoryId,
        typeId: sampleBanknote.typeId
      });
    }
    
    const filtered = items.filter((item) => {
      const banknote = getBanknote(item);
      if (!banknote) {
        return false;
      }

      // Search filter
      const searchLower = currentFilters.search?.toLowerCase() || "";
      const matchesSearch = !currentFilters.search || Object.values(banknote)
        .some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchLower)
        );

      // Category filter - improved matching logic
      let matchesCategory = noCategories;
      
      if (!matchesCategory && banknote.category) {
        // Try direct match by category name
        const lowercaseCategory = banknote.category.toLowerCase();
        matchesCategory = selectedCategoryNames.includes(lowercaseCategory);
        
        // If still no match and banknote has a series, try matching by series
        if (!matchesCategory && banknote.series) {
          matchesCategory = selectedCategoryNames.includes(banknote.series.toLowerCase());
        }
      } 
      // If banknote only has series but no category
      else if (!matchesCategory && banknote.series) {
        matchesCategory = selectedCategoryNames.includes(banknote.series.toLowerCase());
      }
      
      // Type filter - improved matching logic
      let matchesType = noTypes;
      
      if (!matchesType) {
        // Use normalized type for consistent comparison
        const normalizedItemType = normalizeType(banknote.type || "Issued note");
        
        // Try direct match with normalized types
        matchesType = selectedTypeNames.includes(normalizedItemType);
        
        // If no direct match, try fuzzy matching
        if (!matchesType) {
          matchesType = selectedTypeNames.some(typeName => {
            return normalizedItemType.includes(typeName) || typeName.includes(normalizedItemType);
          });
        }
      }

      // Debug output for random samples (to avoid flooding console)
      if (Math.random() < 0.05) {
        console.log(`Filtering banknote ${banknote.id}`, {
          type: banknote.type,
          normalizedType: normalizeType(banknote.type || "Issued note"),
          category: banknote.category,
          series: banknote.series,
          matchesSearch,
          matchesCategory,
          matchesType
        });
      }

      return matchesSearch && matchesCategory && matchesType;
    });
    
    console.log("useDynamicFilter: Filtered items", { 
      before: items.length, 
      after: filtered.length 
    });
    
    const sorted = [...filtered].sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);
      
      if (!banknoteA || !banknoteB) return 0;
      
      // Apply sorting based on selected criteria
      for (const fieldName of currentFilters.sort || []) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (banknoteA.sultanName || "")
              .localeCompare(banknoteB.sultanName || "");
            break;

          case "faceValue":
            const valueA = banknoteA.denomination || banknoteA.face_value || "";
            const valueB = banknoteB.denomination || banknoteB.face_value || "";
            const isKurushA = String(valueA).toLowerCase().includes("kurush");
            const isKurushB = String(valueB).toLowerCase().includes("kurush");
            const isLiraA = String(valueA).toLowerCase().includes("lira");
            const isLiraB = String(valueB).toLowerCase().includes("lira");

            if (isKurushA && isLiraB) comparison = -1;
            else if (isLiraA && isKurushB) comparison = 1;
            else {
              const numA = parseFloat(String(valueA).replace(/[^0-9.]/g, "")) || 0;
              const numB = parseFloat(String(valueB).replace(/[^0-9.]/g, "")) || 0;
              comparison = numA - numB;
            }
            break;

          case "extPick":
            comparison = String(banknoteA.extendedPickNumber || banknoteA.catalogId || banknoteA.extended_pick_number || "")
              .localeCompare(String(banknoteB.extendedPickNumber || banknoteB.catalogId || banknoteB.extended_pick_number || ""));
            break;
            
          case "newest":
            if ('createdAt' in a && 'createdAt' in b) {
              const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
              const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
              comparison = dateB - dateA;
            }
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
    
    console.log("useDynamicFilter: Sorted items count:", sorted.length);
    return sorted;
  }, [items, filters, categoryNameMap, typeNameMap, isLoading, getBanknote]);

  // Group items by category
  const groupedItems = useMemo(() => {
    console.log("useDynamicFilter: Grouping items", { 
      filteredCount: filteredItems.length,
      isLoading 
    });
    
    if (isLoading) return [];
    
    const sortBySultan = filters.sort?.includes("sultan") || false;
    const groups: GroupItem<T>[] = [];
    
    // Safety check for filteredItems
    if (!filteredItems || !Array.isArray(filteredItems) || filteredItems.length === 0) {
      return [];
    }
    
    // Group filtered items by category
    const categoryMap = new Map<string, { name: string, id: string, items: T[] }>();
    
    filteredItems.forEach(item => {
      const banknote = getBanknote(item);
      if (!banknote) return;
      
      // Use category or series as the grouping key
      const categoryName = banknote.category || banknote.series || "Uncategorized";
      
      // Find the category ID if possible - either directly from the banknote or from the map
      let categoryId = '';
      if (banknote.categoryId) {
        categoryId = String(banknote.categoryId);
      } else {
        // Look up category ID by name
        const lowercaseName = categoryName.toLowerCase();
        categoryId = categoryIdByNameMap.get(lowercaseName) || '';
      }
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { 
          name: categoryName, 
          id: categoryId, 
          items: [] 
        });
      }
      categoryMap.get(categoryName)?.items.push(item);
    });
    
    console.log("useDynamicFilter: Category map created with", categoryMap.size, "categories");
    
    // Add all categories in display order
    Array.from(categoryMap.values())
      .sort((a, b) => {
        const catA = effectiveCategories.find(c => c.id === a.id);
        const catB = effectiveCategories.find(c => c.id === b.id);
        
        if (catA && catB && 'display_order' in catA && 'display_order' in catB) {
          return (catA as any).display_order - (catB as any).display_order;
        }
        return a.name.localeCompare(b.name);
      })
      .forEach(({name: category, id: categoryId, items: categoryItems}) => {
        if (!categoryItems || categoryItems.length === 0) return;
          
        const group: GroupItem<T> = { 
          category, 
          categoryId,
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
          
          group.sultanGroups = sultanGroups;
        }
        
        groups.push(group);
      });
    
    console.log("useDynamicFilter: Grouped", filteredItems.length, "items into", groups.length, "groups");
    return groups;
  }, [filteredItems, filters.sort, effectiveCategories, isLoading, getBanknote, categoryIdByNameMap]);

  return {
    filteredItems,
    filters,
    setFilters,
    groupedItems,
    isLoading
  };
};

// Helper function to normalize types for comparison
const normalizeType = (type: string | undefined): string => {
  if (!type) return "";
  
  // Convert to lowercase for case-insensitive comparison
  const lowerType = String(type).toLowerCase();
  
  // Handle common variations of types
  if (lowerType.includes("issued")) return "issued notes";
  if (lowerType.includes("specimen")) return "specimens";
  if (lowerType.includes("cancelled") || lowerType.includes("annule")) return "cancelled & annule";
  if (lowerType.includes("trial")) return "trial note";
  if (lowerType.includes("error")) return "error banknote";
  if (lowerType.includes("counterfeit")) return "counterfeit banknote";
  if (lowerType.includes("emergency")) return "emergency note";
  if (lowerType.includes("check") || lowerType.includes("bond")) return "check & bond notes";
  
  return lowerType;
};
