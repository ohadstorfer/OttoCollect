
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { fetchCategoriesByCountryId, fetchTypesByCountryId, fetchSortOptionsByCountryId } from "@/services/countryService";

interface BanknoteFilterCatalogProps {
  countryId: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
}

export const BanknoteFilterCatalog: React.FC<BanknoteFilterCatalogProps> = ({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);
  const isMounted = useRef(true);
  const previousCountryId = useRef<string | null>(null);
  
  // Track if a filter change is in progress to prevent infinite loops
  const isFilterChangeInProgress = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!countryId || previousCountryId.current === countryId) return;
      
      console.log("BanknoteFilterCatalog: Loading filter options for country:", countryId);
      console.log("BanknoteFilterCatalog: Current filters:", currentFilters);
      
      // Update the previous country ID
      previousCountryId.current = countryId;
      
      if (!isMounted.current) return;
      setLoading(true);
      
      try {
        // Fetch categories, types and sort options in parallel
        console.log("BanknoteFilterCatalog: Fetching categories, types, and sort options");
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
        if (!isMounted.current) return;
        
        console.log("BanknoteFilterCatalog: Fetched data:", { 
          categories: categoriesData, 
          types: typesData, 
          sortOptions: sortOptionsData 
        });
        
        // Map data to FilterOption format
        const mappedCategories = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
        }));
        
        const mappedTypes = typesData.map(type => ({
          id: type.id,
          name: type.name,
        }));
        
        const mappedSortOptions = sortOptionsData.map(sort => ({
          id: sort.id,
          name: sort.name,
          fieldName: sort.field_name,
          isRequired: sort.is_required
        }));
        
        if (!isMounted.current) return;
        
        setCategories(mappedCategories);
        setTypes(mappedTypes);
        setSortOptions(mappedSortOptions);
        
        console.log("BanknoteFilterCatalog: Filter options set successfully");
        
        // Initialize default filters if needed
        if (!hasInitializedFilters && mappedCategories.length > 0) {
          console.log("BanknoteFilterCatalog: Initializing default filters");
          
          // Only set default filters if they're not already set
          const defaultCategoryIds = currentFilters.categories && currentFilters.categories.length > 0 
            ? currentFilters.categories 
            : mappedCategories.map(cat => cat.id);
          
          const defaultTypeIds = currentFilters.types && currentFilters.types.length > 0 
            ? currentFilters.types 
            : mappedTypes.filter(type => type.name.toLowerCase().includes('issued')).map(t => t.id);
          
          // Always include required sort fields
          const requiredSortFields = sortOptionsData
            .filter(opt => opt.is_required)
            .map(opt => opt.field_name || '');
          
          const defaultSortFields = currentFilters.sort && currentFilters.sort.length > 0
            ? Array.from(new Set([...currentFilters.sort, ...requiredSortFields]))
            : requiredSortFields.length > 0 ? requiredSortFields : ['extPick'];
          
          console.log("BanknoteFilterCatalog: Default filters:", { 
            categories: defaultCategoryIds, 
            types: defaultTypeIds, 
            sort: defaultSortFields 
          });
          
          // Only update if we have default values that are different from current ones
          const shouldUpdate = 
            !isFilterChangeInProgress.current && (
              (defaultCategoryIds.length > 0 && JSON.stringify(defaultCategoryIds) !== JSON.stringify(currentFilters.categories)) ||
              (defaultTypeIds.length > 0 && JSON.stringify(defaultTypeIds) !== JSON.stringify(currentFilters.types)) ||
              (defaultSortFields.length > 0 && JSON.stringify(defaultSortFields) !== JSON.stringify(currentFilters.sort))
            );
          
          if (shouldUpdate) {
            console.log("BanknoteFilterCatalog: Updating with default filters");
            isFilterChangeInProgress.current = true;
            
            const updatedFilters = {
              categories: defaultCategoryIds,
              types: defaultTypeIds,
              sort: defaultSortFields,
              country_id: countryId // Ensure country_id is set
            };
            
            onFilterChange(updatedFilters);
            
            setTimeout(() => {
              isFilterChangeInProgress.current = false;
            }, 100);
          }
          
          setHasInitializedFilters(true);
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    loadFilterOptions();
  }, [countryId, currentFilters, hasInitializedFilters, onFilterChange]);

  // Filter change handler
  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    if (isFilterChangeInProgress.current) {
      console.log("BanknoteFilterCatalog: Skipping filter change due to another change in progress");
      return;
    }
    
    console.log("BanknoteFilterCatalog: Filter change requested:", newFilters);
    
    isFilterChangeInProgress.current = true;
    
    // Always add the countryId to filter changes
    const filtersWithCountryId = {
      ...newFilters,
      country_id: countryId
    };
    
    onFilterChange(filtersWithCountryId);
    
    setTimeout(() => {
      isFilterChangeInProgress.current = false;
    }, 100);
  };

  return (
    <BaseBanknoteFilter
      categories={categories}
      types={types}
      sortOptions={sortOptions}
      onFilterChange={handleFilterChange}
      currentFilters={currentFilters}
      isLoading={isLoading || loading}
      className={className}
    />
  );
};
