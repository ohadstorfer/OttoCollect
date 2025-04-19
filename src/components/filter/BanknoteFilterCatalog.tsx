
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { 
  fetchCategoriesByCountryId, 
  fetchTypesByCountryId, 
  fetchSortOptionsByCountryId, 
  saveUserFilterPreferences, 
  fetchUserFilterPreferences 
} from "@/services/countryService";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  console.log("BanknoteFilterCatalog: Rendering with", { 
    countryId, 
    currentFilters,
    isLoading, 
    loading,
    categories: categories.length,
    types: types.length,
    sortOptions: sortOptions.length
  });

  // Load filter options and user preferences when countryId changes
  useEffect(() => {
    const loadFilterOptionsAndPreferences = async () => {
      if (!countryId) return;
      
      console.log("BanknoteFilterCatalog: Loading filter options for country:", countryId);
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
        
        // Try to fetch user preferences if user is logged in
        let userPreferences = null;
        if (user) {
          try {
            userPreferences = await fetchUserFilterPreferences(user.id, countryId);
            console.log("BanknoteFilterCatalog: User preferences loaded", userPreferences);
          } catch (err) {
            console.error("Error fetching user preferences:", err);
          }
        }
        
        // Set default filters based on user preferences or sensible defaults
        const requiredSortFields = sortOptionsData
          .filter(opt => opt.is_required)
          .map(opt => opt.field_name || '');
          
        if (userPreferences) {
          // Map IDs to field names for sort options
          const sortFieldNames = userPreferences.selected_sort_options
            .map(sortId => {
              const option = sortOptionsData.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          // Ensure required sort fields are included
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
          // Apply user preferences
          onFilterChange({
            categories: userPreferences.selected_categories,
            types: userPreferences.selected_types,
            sort: finalSortFields,
            country_id: countryId
          });
        } else {
          // Apply default filters
          const defaultCategoryIds = mappedCategories.map(cat => cat.id);
          const defaultTypeIds = mappedTypes
            .filter(type => type.name.toLowerCase().includes('issued'))
            .map(t => t.id);
            
          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: requiredSortFields.length > 0 ? requiredSortFields : ['extPick'],
            country_id: countryId
          });
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
        toast({
          title: "Error",
          description: "Failed to load filter options.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptionsAndPreferences();
  }, [countryId, user, onFilterChange, toast]);

  // Filter change handler
  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    console.log("BanknoteFilterCatalog: Filter change requested:", newFilters);
    
    // Always add the countryId to filter changes
    const filtersWithCountryId = {
      ...newFilters,
      country_id: countryId
    };
    
    // Pass changes to parent component
    onFilterChange(filtersWithCountryId);
  };

  // Save filter preferences to the database
  const handleSaveFilters = async () => {
    if (!user?.id || !countryId) {
      toast({
        title: "Error",
        description: "You must be logged in to save filter preferences.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log("BanknoteFilterCatalog: Saving filter preferences to database", currentFilters);

      // Map sort field names back to IDs
      const sortOptionIds = currentFilters.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
      
      const success = await saveUserFilterPreferences(
        user.id,
        countryId,
        currentFilters.categories || [],
        currentFilters.types || [],
        sortOptionIds
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "Filter preferences saved successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save filter preferences.",
          variant: "destructive",
        });
      }
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
      isLoading={isLoading || loading || isSaving}
      className={className}
      onSaveFilters={handleSaveFilters}
      saveButtonText={isSaving ? "Saving..." : "Save Filter Preferences"}
    />
  );
};
