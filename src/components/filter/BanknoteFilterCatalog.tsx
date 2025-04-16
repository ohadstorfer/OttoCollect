
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!countryId) return;
      
      console.log("BanknoteFilterCatalog: Loading filter options for country:", countryId);
      console.log("BanknoteFilterCatalog: Current filters:", currentFilters);
      
      setLoading(true);
      try {
        // Fetch categories, types and sort options in parallel
        console.log("BanknoteFilterCatalog: Fetching categories, types, and sort options");
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
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
          
          const defaultSortFields = currentFilters.sort && currentFilters.sort.length > 0
            ? currentFilters.sort
            : mappedSortOptions.filter(opt => opt.isRequired).map(opt => opt.fieldName || '');
          
          console.log("BanknoteFilterCatalog: Default filters:", { 
            categories: defaultCategoryIds, 
            types: defaultTypeIds, 
            sort: defaultSortFields 
          });
          
          // Only update if we have default values that are different from current ones
          const shouldUpdate = 
            (defaultCategoryIds.length > 0 && JSON.stringify(defaultCategoryIds) !== JSON.stringify(currentFilters.categories)) ||
            (defaultTypeIds.length > 0 && JSON.stringify(defaultTypeIds) !== JSON.stringify(currentFilters.types)) ||
            (defaultSortFields.length > 0 && JSON.stringify(defaultSortFields) !== JSON.stringify(currentFilters.sort));
          
          if (shouldUpdate) {
            console.log("BanknoteFilterCatalog: Updating with default filters");
            onFilterChange({
              categories: defaultCategoryIds,
              types: defaultTypeIds,
              sort: defaultSortFields
            });
          }
          
          setHasInitializedFilters(true);
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [countryId]);

  // Filter change handler
  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    console.log("BanknoteFilterCatalog: Filter change requested:", newFilters);
    onFilterChange(newFilters);
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
