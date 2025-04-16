
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

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!countryId) return;
      
      setLoading(true);
      try {
        // Fetch categories, types and sort options in parallel
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
        // Map data to FilterOption format
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
        })));
        
        setTypes(typesData.map(type => ({
          id: type.id,
          name: type.name,
        })));
        
        setSortOptions(sortOptionsData.map(sort => ({
          id: sort.id,
          name: sort.name,
          fieldName: sort.field_name,
          isRequired: sort.is_required
        })));
      } catch (error) {
        console.error("Error loading filter options:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [countryId]);

  return (
    <BaseBanknoteFilter
      categories={categories}
      types={types}
      sortOptions={sortOptions}
      onFilterChange={onFilterChange}
      currentFilters={currentFilters}
      isLoading={isLoading || loading}
      className={className}
    />
  );
};
