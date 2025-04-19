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
  const preferencesLoaded = useRef(false);

  console.log("useDynamicFilter: Initialize with", { 
    itemsCount: items.length, 
    countryId, 
    userId, 
    initialFilters 
  });

  const effectiveCategories = useMemo(() => {
    return categories.length > 0 ? categories : collectionCategories;
  }, [categories, collectionCategories]);

  const effectiveTypes = useMemo(() => {
    return types.length > 0 ? types : collectionTypes;
  }, [types, collectionTypes]);

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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!countryId) {
        console.log("useDynamicFilter: No countryId, skipping preferences load");
        setIsLoading(false);
        return;
      }

      if (preferencesLoaded.current && filters.country_id === countryId) {
        console.log("useDynamicFilter: Preferences already loaded for this countryId");
        setIsLoading(false);
        return;
      }

      console.log("useDynamicFilter: Loading preferences for", { userId, countryId });
      try {
        setIsLoading(true);
        
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
          const sortFieldNames = userPrefs.selected_sort_options
            .map(sortId => {
              const option = sortOptions.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
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
              country_id: countryId
            };
            
            console.log("useDynamicFilter: New filters from preferences", newFilters);
            setFiltersState(newFilters);
            filtersRef.current = newFilters;
            preferencesLoaded.current = true;
            
            setTimeout(() => {
              isUpdatingFilters.current = false;
            }, 100);
          }
        } else {
          if (isMounted.current && !isUpdatingFilters.current) {
            console.log("useDynamicFilter: Setting default filters");
            isUpdatingFilters.current = true;
            
            const newFilters = {
              ...filters,
              categories: defaultCategoryIds,
              types: defaultTypeIds.length > 0 ? defaultTypeIds : effectiveTypes?.map(t => t.id) || [],
              sort: requiredSortFields.length > 0 ? requiredSortFields : defaultSortFields,
              country_id: countryId
            };
            
            console.log("useDynamicFilter: Default filters set", newFilters);
            setFiltersState(newFilters);
            filtersRef.current = newFilters;
            preferencesLoaded.current = true;
            
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

  const getBanknote = useCallback((item: T): any => {
    if ((item as any).banknote) {
      return (item as any).banknote;
    }
    return item;
  }, []);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveCategories.forEach(cat => {
      map.set(cat.id, cat.name);
    });
    return map;
  }, [effectiveCategories]);

  const typeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveTypes.forEach(type => {
      map.set(type.id, type.name);
    });
    return map;
  }, [effectiveTypes]);

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

  const getFieldValue = useCallback((banknote: any, fieldName: string): any => {
    if (!banknote) return null;
    
    const camelCase = fieldName;
    const snakeCase = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    
    const possibleNames = [
      fieldName,
      camelCase,
      snakeCase,
      `${fieldName}Name`,
      `${snakeCase}_name`,
    ];
    
    for (const name of possibleNames) {
      if (banknote[name] !== undefined && banknote[name] !== null) {
        return banknote[name];
      }
    }
    
    return null;
  }, []);

  const filteredItems = useMemo(() => {
    console.log("useDynamicFilter: Filtering items", { 
      itemsCount: items.length, 
      filters: filtersRef.current || filters,
      isLoading
    });
    
    if (isLoading) {
      console.log("useDynamicFilter: Still loading, returning empty array");
      return [];
    }
    
    const currentFilters = filtersRef.current || filters;
    
    const noCategories = !currentFilters.categories || currentFilters.categories.length === 0;
    const noTypes = !currentFilters.types || currentFilters.types.length === 0;
    
    console.log("useDynamicFilter: Filter status", { 
      noCategories, 
      noTypes, 
      categoryFilters: currentFilters.categories,
      typeFilters: currentFilters.types
    });
    
    if (!items || !Array.isArray(items)) {
      console.log("useDynamicFilter: Items is not an array, returning empty array");
      return [];
    }
    
    const selectedCategoryNames = currentFilters.categories
      .map(id => categoryNameMap.get(id))
      .filter(Boolean)
      .map(name => name.toLowerCase());
    
    const selectedTypeNames = currentFilters.types
      .map(id => typeNameMap.get(id))
      .filter(Boolean)
      .map(name => normalizeType(name));
    
    if (selectedCategoryNames.length > 0) {
      console.log("useDynamicFilter: Selected category names:", selectedCategoryNames);
    }
    if (selectedTypeNames.length > 0) {
      console.log("useDynamicFilter: Selected type names:", selectedTypeNames);
    }
    
    const filtered = items.filter((item) => {
      const banknote = getBanknote(item);
      if (!banknote) {
        return false;
      }

      const searchLower = currentFilters.search?.toLowerCase() || "";
      const matchesSearch = !currentFilters.search || Object.values(banknote)
        .some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchLower)
        );

      let matchesCategory = noCategories;
      
      if (!matchesCategory && banknote.category) {
        const lowercaseCategory = banknote.category.toLowerCase();
        matchesCategory = selectedCategoryNames.includes(lowercaseCategory);
        
        if (!matchesCategory && banknote.series) {
          matchesCategory = selectedCategoryNames.includes(banknote.series.toLowerCase());
        }
      } else if (!matchesCategory && banknote.series) {
        matchesCategory = selectedCategoryNames.includes(banknote.series.toLowerCase());
      }
      
      let matchesType = noTypes;
      
      if (!matchesType) {
        const normalizedItemType = normalizeType(banknote.type || "Issued note");
        
        matchesType = selectedTypeNames.includes(normalizedItemType);
        
        if (!matchesType) {
          matchesType = selectedTypeNames.some(typeName => {
            return normalizedItemType.includes(typeName) || typeName.includes(normalizedItemType);
          });
        }
      }

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
      
      for (const fieldName of currentFilters.sort || []) {
        let comparison = 0;

        switch (fieldName) {
          case "newest":
            if ('createdAt' in a && 'createdAt' in b) {
              const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
              const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
              comparison = dateB - dateA;
            }
            break;
            
          default:
            const valueA = getFieldValue(banknoteA, fieldName);
            const valueB = getFieldValue(banknoteB, fieldName);
            
            if (valueA !== null && valueB !== null) {
              if (fieldName === 'faceValue' && 
                  (typeof valueA === 'string' && typeof valueB === 'string')) {
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
              }
              else if (fieldName === 'extPick') {
                comparison = String(
                  banknoteA.extendedPickNumber || 
                  banknoteA.catalogId || 
                  banknoteA.extended_pick_number || ""
                ).localeCompare(String(
                  banknoteB.extendedPickNumber || 
                  banknoteB.catalogId || 
                  banknoteB.extended_pick_number || ""
                ));
              }
              else if (typeof valueA === 'string' && typeof valueB === 'string') {
                comparison = valueA.localeCompare(valueB);
              } 
              else {
                comparison = Number(valueA) - Number(valueB);
              }
            }
            break;
        }

        if (comparison !== 0) return comparison;
      }
      return 0;
    });
    
    console.log("useDynamicFilter: Sorted items count:", sorted.length);
    return sorted;
  }, [items, filters, categoryNameMap, typeNameMap, isLoading, getBanknote, getFieldValue]);

  const groupedItems = useMemo(() => {
    console.log("useDynamicFilter: Grouping items", { 
      filteredCount: filteredItems.length,
      isLoading 
    });
    
    if (isLoading) return [];
    
    const sortBySultan = filters.sort?.includes("sultan") || false;
    const groups: GroupItem<T>[] = [];
    
    if (!filteredItems || !Array.isArray(filteredItems) || filteredItems.length === 0) {
      return [];
    }
    
    const categoryMap = new Map<string, { name: string, id: string, items: T[] }>();
    
    filteredItems.forEach(item => {
      const banknote = getBanknote(item);
      if (!banknote) return;
      
      const categoryName = banknote.category || banknote.series || "Uncategorized";
      
      let categoryId = '';
      if (banknote.categoryId) {
        categoryId = String(banknote.categoryId);
      } else {
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
        
        if (sortBySultan) {
          const sultanMap = new Map<string, T[]>();
          categoryItems.forEach(item => {
            const banknote = getBanknote(item);
            if (!banknote) return;
            
            const sultan = banknote.sultanName || banknote.sultan_name || banknote.sultan || "Unknown";
            if (!sultanMap.has(sultan)) {
              sultanMap.set(sultan, []);
            }
            sultanMap.get(sultan)?.push(item);
          });
          
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

const normalizeType = (type: string | undefined): string => {
  if (!type) return "";
  
  const lowerType = String(type).toLowerCase();
  
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
