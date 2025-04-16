import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { fetchCategoriesByCountryId, fetchTypesByCountryId, fetchSortOptionsByCountryId } from "@/services/countryService";

interface BanknoteFilterMarketplaceProps {
  countryId?: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  // Additional marketplace-specific props can be added here
  marketplaceCategories?: { id: string; name: string; count: number }[];
  marketplaceTypes?: { id: string; name: string; count: number }[];
}

export const BanknoteFilterMarketplace: React.FC<BanknoteFilterMarketplaceProps> = ({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  marketplaceCategories = [],
  marketplaceTypes = [],
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>(marketplaceCategories);
  const [types, setTypes] = useState<FilterOption[]>(marketplaceTypes);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no countryId provided, use the marketplace categories and types directly
    if (!countryId) {
      setCategories(marketplaceCategories);
      setTypes(marketplaceTypes);
      
      // Set default sort options for marketplace
      setSortOptions([
        { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
        { id: "price", name: "Price (Low to High)", fieldName: "price" },
        { id: "newest", name: "Newly Listed", fieldName: "newest" },
        { id: "sultan", name: "Sultan", fieldName: "sultan" },
        { id: "faceValue", name: "Face Value", fieldName: "faceValue" }
      ]);
      
      setLoading(false);
      return;
    }
    
    // Otherwise load from the database for the specific country
    const loadFilterOptions = async () => {
      setLoading(true);
      try {
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
        })));
        
        setTypes(typesData.map(type => ({
          id: type.id,
          name: type.name,
        })));
        
        // Enhance sort options for marketplace
        const marketplaceSorts = [
          { id: "price", name: "Price (Low to High)", fieldName: "price" },
          { id: "newest", name: "Newly Listed", fieldName: "newest" }
        ];
        
        setSortOptions([
          ...marketplaceSorts,
          ...sortOptionsData.map(sort => ({
            id: sort.id,
            name: sort.name,
            fieldName: sort.field_name,
            isRequired: sort.is_required
          }))
        ]);
      } catch (error) {
        console.error("Error loading filter options:", error);
        
        // Fallback to marketplace data
        setCategories(marketplaceCategories);
        setTypes(marketplaceTypes);
        
        // Set default sort options
        setSortOptions([
          { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
          { id: "price", name: "Price (Low to High)", fieldName: "price" },
          { id: "newest", name: "Newly Listed", fieldName: "newest" },
          { id: "sultan", name: "Sultan", fieldName: "sultan" },
          { id: "faceValue", name: "Face Value", fieldName: "faceValue" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [countryId, marketplaceCategories, marketplaceTypes]);

  // Update categories and types when marketplaceCategories and marketplaceTypes change
  useEffect(() => {
    if (!countryId) {
      setCategories(marketplaceCategories);
      setTypes(marketplaceTypes);
    }
  }, [marketplaceCategories, marketplaceTypes, countryId]);

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
