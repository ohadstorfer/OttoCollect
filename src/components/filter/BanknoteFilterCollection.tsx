
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { fetchCategoriesByCountryId, fetchTypesByCountryId, fetchSortOptionsByCountryId, saveUserFilterPreferences } from "@/services/countryService";
import { useToast } from "@/hooks/use-toast";

interface BanknoteFilterCollectionProps {
  countryId?: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  // Additional collection-specific props
  collectionCategories?: { id: string; name: string; count?: number }[];
  collectionTypes?: { id: string; name: string; count?: number }[];
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  console.log("BanknoteFilterCollection: Rendering with", {
    countryId,
    currentFilters,
    collectionCategories: collectionCategories?.length,
    collectionTypes: collectionTypes?.length
  });

  useEffect(() => {
    // If no countryId provided, use the collection categories and types directly
    if (!countryId) {
      console.log("BanknoteFilterCollection: Using provided collection categories and types");
      // Safety check for collectionCategories
      const categoriesToUse = collectionCategories || [];
      setCategories(categoriesToUse.map(cat => ({
        id: cat.id,
        name: cat.name,
        count: cat.count
      })));
      
      // Safety check for collectionTypes
      const typesToUse = collectionTypes || [];
      setTypes(typesToUse.map(type => ({
        id: type.id,
        name: type.name,
        count: type.count
      })));
      
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
        console.log("BanknoteFilterCollection: Loading filter options for country", countryId);
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

        console.log("BanknoteFilterCollection: Loaded filter options", {
          categories: categoriesData.length,
          types: typesData.length,
          sortOptions: sortOptionsData.length
        });
      } catch (error) {
        console.error("Error loading filter options:", error);
        
        // Fallback to collection data
        setCategories((collectionCategories || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat.count
        })));
        
        setTypes((collectionTypes || []).map(type => ({
          id: type.id,
          name: type.name,
          count: type.count
        })));
        
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
    if (!countryId && (collectionCategories || collectionTypes)) {
      console.log("BanknoteFilterCollection: Updating with new collection data");
      if (collectionCategories && collectionCategories.length > 0) {
        setCategories(collectionCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat.count
        })));
      }
      
      if (collectionTypes && collectionTypes.length > 0) {
        setTypes(collectionTypes.map(type => ({
          id: type.id,
          name: type.name,
          count: type.count
        })));
      }
    }
  }, [collectionCategories, collectionTypes, countryId]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    console.log("BanknoteFilterCollection: Filter change", newFilters);
    onFilterChange(newFilters);
  };

  // Save filters to user preferences
  const handleSaveFilters = async () => {
    if (!user?.id) {
      toast({
        title: "Not Logged In",
        description: "You need to be logged in to save filter preferences.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("BanknoteFilterCollection: Saving filter preferences");
    setIsSaving(true);
    
    try {
      const categoryIds = currentFilters.categories || [];
      const typeIds = currentFilters.types || [];
      const sortOptionIds = sortOptions
        .filter(option => currentFilters.sort?.includes(option.fieldName || ''))
        .map(option => option.id);
        
      if (countryId) {
        // If we have a countryId, save to the database
        await saveUserFilterPreferences(
          user.id,
          countryId,
          categoryIds,
          typeIds,
          sortOptionIds
        );
      }
      
      toast({
        title: "Success",
        description: "Filter preferences saved.",
      });
    } catch (error) {
      console.error("Error saving filter preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save filter preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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
      onSaveFilters={handleSaveFilters}
      saveButtonText={isSaving ? "Saving..." : "Save Filter Preferences"}
    />
  );
};
