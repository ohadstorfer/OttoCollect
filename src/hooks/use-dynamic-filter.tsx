
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { DynamicFilterState, FilterableItem } from "@/types/filter";
import { fetchUserFilterPreferences, saveUserFilterPreferences } from "@/services/countryService";

interface UseDynamicFilterProps<T extends FilterableItem> {
  items: T[];
  initialFilters?: Partial<DynamicFilterState>;
  countryId?: string;
  categories: { id: string; name: string; count?: number }[];
  types: { id: string; name: string; count?: number }[];
  sortOptions: { id: string; name: string; field_name: string; is_required: boolean }[];
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
  categories,
  types,
  sortOptions,
}: UseDynamicFilterProps<T>): UseDynamicFilterResult<T> => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const userId = user?.id;
  
  // Determine default sort options
  const defaultSortFields = useMemo(() => {
    return sortOptions
      .filter(option => option.is_required)
      .map(option => option.field_name);
  }, [sortOptions]);

  const [filters, setFiltersState] = useState<DynamicFilterState>({
    search: initialFilters.search || "",
    categories: initialFilters.categories || [],
    types: initialFilters.types || [],
    sort: initialFilters.sort || defaultSortFields,
    country_id: countryId
  });

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!countryId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Set default values first (will be overridden by user preferences if they exist)
        const defaultCategoryIds = categories.map(cat => cat.id);
        const defaultTypeIds = types
          .filter(type => type.name.toLowerCase().includes('issued'))
          .map(type => type.id);
          
        const requiredSortFields = sortOptions
          .filter(option => option.is_required)
          .map(option => option.field_name);
          
        // Try to load user preferences
        let userPrefs = null;
        if (userId) {
          userPrefs = await fetchUserFilterPreferences(userId, countryId);
        }
        
        if (userPrefs) {
          // Map IDs to field names for sort options
          const sortFieldNames = userPrefs.selected_sort_options
            .map(sortId => {
              const option = sortOptions.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          // Ensure required sort fields are included
          const finalSortFields = [...new Set([...sortFieldNames, ...requiredSortFields])];
          
          setFiltersState(prev => ({
            ...prev,
            categories: userPrefs.selected_categories.length > 0 ? userPrefs.selected_categories : defaultCategoryIds,
            types: userPrefs.selected_types.length > 0 ? userPrefs.selected_types : defaultTypeIds,
            sort: finalSortFields.length > 0 ? finalSortFields : requiredSortFields
          }));
        } else {
          // Set defaults if no preferences found
          setFiltersState(prev => ({
            ...prev,
            categories: defaultCategoryIds,
            types: defaultTypeIds.length > 0 ? defaultTypeIds : types.map(t => t.id),
            sort: requiredSortFields
          }));
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
        
        // Set default values in case of error
        const defaultCategoryIds = categories.map(cat => cat.id);
        const defaultTypeIds = types
          .filter(type => type.name.toLowerCase().includes('issued'))
          .map(type => type.id);
          
        setFiltersState(prev => ({
          ...prev,
          categories: defaultCategoryIds,
          types: defaultTypeIds.length > 0 ? defaultTypeIds : types.map(t => t.id),
          sort: defaultSortFields
        }));
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, [userId, countryId, categories, types, sortOptions, defaultSortFields]);

  // Handle filter changes with debouncing
  const setFilters = async (changes: Partial<DynamicFilterState>) => {
    const newFilters = { ...filters, ...changes };
    setFiltersState(newFilters);

    // Save user preferences when filters change (only if user is logged in)
    if (userId && countryId && !isLoading) {
      try {
        // Map sort field names back to IDs
        const sortOptionIds = newFilters.sort
          .map(fieldName => {
            const option = sortOptions.find(opt => opt.field_name === fieldName);
            return option ? option.id : null;
          })
          .filter(Boolean) as string[];
        
        await saveUserFilterPreferences(
          userId,
          countryId,
          newFilters.categories,
          newFilters.types,
          sortOptionIds
        );
      } catch (error) {
        console.error("Error saving filter preferences:", error);
      }
    }
  };

  // Extract banknote from item
  const getBanknote = (item: T): any => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item;
  };

  // Filter items based on criteria
  const filteredItems = useMemo(() => {
    // When loading, return empty array
    if (isLoading) return [];
    
    // When no filters are selected, show all items
    const noCategories = !filters.categories || filters.categories.length === 0;
    const noTypes = !filters.types || filters.types.length === 0;
    
    const filtered = items.filter((item) => {
      const banknote = getBanknote(item);
      if (!banknote) return false;

      // Search filter
      const searchLower = filters.search?.toLowerCase() || "";
      const matchesSearch = !filters.search || Object.values(banknote)
        .some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchLower)
        );

      // Category filter - match by category ID
      const matchesCategory = noCategories || 
        (filters.categories && filters.categories.includes(banknote.categoryId)) ||
        (banknote.series && filters.categories && filters.categories.some(catId => {
          const category = categories.find(c => c.id === catId);
          return category && banknote.series === category.name;
        }));
      
      // Type filter - match by type ID
      const matchesType = noTypes || 
        (filters.types && filters.types.includes(banknote.typeId)) ||
        (banknote.type && filters.types && filters.types.some(typeId => {
          const typeDefinition = types.find(t => t.id === typeId);
          return typeDefinition && normalizeType(banknote.type) === normalizeType(typeDefinition.name);
        }));

      return matchesSearch && matchesCategory && matchesType;
    });
    
    // Sort the filtered items
    const sorted = [...filtered].sort((a, b) => {
      const banknoteA = getBanknote(a);
      const banknoteB = getBanknote(b);
      
      if (!banknoteA || !banknoteB) return 0;
      
      // Apply sorting based on selected criteria
      for (const fieldName of filters.sort || []) {
        let comparison = 0;

        switch (fieldName) {
          case "sultan":
            comparison = (banknoteA.sultanName || "")
              .localeCompare(banknoteB.sultanName || "");
            break;

          case "faceValue":
            const valueA = banknoteA.denomination || banknoteA.face_value || "";
            const valueB = banknoteB.denomination || banknoteB.face_value || "";
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
            if ('createdAt' in a && 'createdAt' in b) {
              const dateA = new Date(String(a.createdAt)).getTime();
              const dateB = new Date(String(b.createdAt)).getTime();
              comparison = dateB - dateA;
            }
            break;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
    
    return sorted;
  }, [items, filters, categories, types, isLoading]);

  // Group items by category and optionally by sultan within category
  const groupedItems = useMemo(() => {
    if (isLoading) return [];
    
    const sortBySultan = filters.sort?.includes("sultan") || false;
    const groups: GroupItem<T>[] = [];
    
    // Associate categories with their IDs for lookup
    const categoryLookup = new Map<string, string>();
    categories.forEach(cat => categoryLookup.set(cat.name, cat.id));
    
    // Group filtered items by category
    const categoryMap = new Map<string, { name: string, id: string, items: T[] }>();
    
    filteredItems.forEach(item => {
      const banknote = getBanknote(item);
      if (!banknote || !banknote.series) return;
      
      const categoryName = banknote.series;
      const categoryId = banknote.categoryId || categoryLookup.get(categoryName) || '';
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { 
          name: categoryName, 
          id: categoryId, 
          items: [] 
        });
      }
      categoryMap.get(categoryName)?.items.push(item);
    });
    
    // Add all categories in display order
    Array.from(categoryMap.values())
      .sort((a, b) => {
        const catA = categories.find(c => c.id === a.id);
        const catB = categories.find(c => c.id === b.id);
        
        if (catA && catB) {
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
    
    return groups;
  }, [filteredItems, filters.sort, categories, isLoading]);

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
  
  return lowerType;
};
