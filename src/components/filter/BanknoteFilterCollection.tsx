import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { fetchCategoriesByCountryId, fetchTypesByCountryId, fetchSortOptionsByCountryId } from "@/services/countryService";

interface BanknoteFilterCollectionProps {
  countryId?: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  // Additional collection-specific props can be added here
  collectionCategories?: { id: string; name: string; count: number }[];
  collectionTypes?: { id: string; name: string; count: number }[];
}

export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = ({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  collectionCategories = [],
  collectionTypes = [],
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>(collectionCategories);
  const [types, setTypes] = useState<FilterOption[]>(collectionTypes);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no countryId provided, use the collection categories and types directly
    if (!countryId) {
      setCategories(collectionCategories);
      setTypes(collectionTypes);
      
      // Set default sort options for collection
      setSortOptions([
        { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
        { id: "newest", name: "Newest First", fieldName: "newest" },
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
        
        setSortOptions(sortOptionsData.map(sort => ({
          id: sort.id,
          name: sort.name,
          fieldName: sort.field_name,
          isRequired: sort.is_required
        })));
      } catch (error) {
        console.error("Error loading filter options:", error);
        
        // Fallback to collection data
        setCategories(collectionCategories);
        setTypes(collectionTypes);
        
        // Set default sort options
        setSortOptions([
          { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
          { id: "newest", name: "Newest First", fieldName: "newest" },
          { id: "sultan", name: "Sultan", fieldName: "sultan" },
          { id: "faceValue", name: "Face Value", fieldName: "faceValue" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [countryId, collectionCategories, collectionTypes]);

  // Update categories and types when collectionCategories and collectionTypes change
  useEffect(() => {
    if (!countryId) {
      setCategories(collectionCategories);
      setTypes(collectionTypes);
    }
  }, [collectionCategories, collectionTypes, countryId]);

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
