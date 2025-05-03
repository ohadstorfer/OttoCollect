
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
    if (userId && countryId && !preferencesLoaded.current) {
      const loadUserPreferences = async () => {
        try {
          console.log("useDynamicFilter: Loading user preferences");
          const preferences = await fetchUserFilterPreferences(userId, countryId);
          
          if (preferences && isMounted.current && !preferencesLoaded.current) {
            console.log("useDynamicFilter: User preferences loaded", preferences);
            
            // Map sort option IDs to field names
            const sortFieldNames = preferences.selected_sort_options
              .map(sortId => {
                const option = sortOptions.find(opt => opt.id === sortId);
                return option ? option.field_name : null;
              })
              .filter(Boolean) as string[];
              
            // Ensure required sort fields are included
            const requiredSortFields = sortOptions
              .filter(opt => opt.is_required)
              .map(opt => opt.field_name);
              
            const finalSortFields = Array.from(
              new Set([...sortFieldNames, ...requiredSortFields])
            );
            
            // Set filters based on preferences
            setFiltersState({
              search: filters.search,
              categories: preferences.selected_categories.length > 0 ? 
                preferences.selected_categories : 
                effectiveCategories.map(c => c.id),
              types: preferences.selected_types.length > 0 ? 
                preferences.selected_types : 
                effectiveTypes.filter(t => t.name.toLowerCase().includes('issued')).map(t => t.id),
              sort: finalSortFields.length > 0 ? 
                finalSortFields : 
                defaultSortFields,
              country_id: countryId
            });
            
            preferencesLoaded.current = true;
          }
        } catch (error) {
          console.error("Error loading user preferences:", error);
        } finally {
          if (isMounted.current) {
            setIsLoading(false);
          }
        }
      };
      
      loadUserPreferences();
    } else {
      // Set default filters if no user or countryId
      if (!preferencesLoaded.current) {
        console.log("useDynamicFilter: Setting default filters");
        
        setFiltersState({
          search: filters.search,
          categories: effectiveCategories.map(c => c.id),
          types: effectiveTypes.filter(t => t.name.toLowerCase().includes('issued')).map(t => t.id),
          sort: defaultSortFields,
          country_id: countryId
        });
        
        preferencesLoaded.current = true;
      }
      
      setIsLoading(false);
    }
  }, [userId, countryId, sortOptions, effectiveCategories, effectiveTypes, defaultSortFields, filters.search]);

  // Memoized handler to update filters
  const setFilters = useCallback((newFilters: Partial<DynamicFilterState>) => {
    console.log("useDynamicFilter: Setting filters", newFilters);
    
    setFiltersState(prev => {
      // Construct the new filters
      const updated = { ...prev, ...newFilters };
      
      // Save reference to current filters for comparison
      filtersRef.current = updated;
      
      return updated;
    });
  }, []);
  
  // Apply filters to items
  const filteredItems = useMemo(() => {
    if (!items?.length) return [];
    
    console.log("useDynamicFilter: Applying filters");
    
    return items.filter((item) => {
      // Filter by search term if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const banknote = item.banknote || item;
        
        const matchesSearch =
          banknote.denomination?.toLowerCase().includes(searchTerm) ||
          banknote.year?.toLowerCase().includes(searchTerm) ||
          banknote.series?.toLowerCase().includes(searchTerm) ||
          banknote.extendedPickNumber?.toLowerCase().includes(searchTerm) ||
          banknote.description?.toLowerCase().includes(searchTerm) ||
          (banknote.type as string)?.toLowerCase().includes(searchTerm) ||
          (banknote.category as string)?.toLowerCase().includes(searchTerm);
          
        if (!matchesSearch) return false;
      }
      
      // Filter by categories
      if (filters.categories && filters.categories.length > 0) {
        const categoryId = (item as any).banknote?.category || (item as any).category;
        if (categoryId && !filters.categories.includes(categoryId)) return false;
      }
      
      // Filter by types
      if (filters.types && filters.types.length > 0) {
        const typeId = (item as any).banknote?.type || (item as any).type;
        if (typeId && !filters.types.includes(typeId)) return false;
      }
      
      return true;
    });
  }, [items, filters.search, filters.categories, filters.types]);
  
  // Group items
  const groupedItems = useMemo(() => {
    if (!filteredItems.length) return [];
    
    console.log("useDynamicFilter: Grouping items");
    
    const groups: Record<string, GroupItem<T>> = {};
    
    filteredItems.forEach((item) => {
      const banknote = (item as any).banknote || item;
      const category = banknote.category || 'Uncategorized';
      const categoryId = typeof category === 'string' ? category : category.id;
      
      if (!groups[category]) {
        groups[category] = {
          category,
          categoryId,
          items: [],
          sultanGroups: []
        };
      }
      
      groups[category].items.push(item);
      
      // Sub-group by sultan if available
      if (banknote.sultanName) {
        const sultanName = banknote.sultanName;
        
        if (!groups[category].sultanGroups) {
          groups[category].sultanGroups = [];
        }
        
        let sultanGroup = groups[category].sultanGroups!.find(g => g.sultan === sultanName);
        
        if (!sultanGroup) {
          sultanGroup = {
            sultan: sultanName,
            items: []
          };
          groups[category].sultanGroups!.push(sultanGroup);
        }
        
        sultanGroup.items.push(item);
      }
    });
    
    // Convert groups object to array and sort by category name
    return Object.values(groups)
      .map(group => ({
        ...group,
        sultanGroups: group.sultanGroups && group.sultanGroups.length > 0 ? 
          [...group.sultanGroups].sort((a, b) => a.sultan.localeCompare(b.sultan)) : 
          undefined
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredItems]);
  
  return {
    filteredItems,
    filters,
    setFilters,
    groupedItems,
    isLoading
  };
};
