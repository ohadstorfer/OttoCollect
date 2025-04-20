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
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from "lucide-react";

interface BanknoteFilterCatalogProps {
  countryId: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const BanknoteFilterCatalog: React.FC<BanknoteFilterCatalogProps> = ({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onViewModeChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  console.log("BanknoteFilterCatalog: Rendering with", { 
    countryId, 
    currentFilters,
    isLoading, 
    loading,
    categories: categories.length,
    types: types.length,
    sortOptions: sortOptions.length
  });

  useEffect(() => {
    const loadFilterOptionsAndPreferences = async () => {
      if (!countryId) return;
      
      console.log("BanknoteFilterCatalog: Loading filter options for country:", countryId);
      setLoading(true);
      
      try {
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
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
        
        let userPreferences = null;
        if (user) {
          try {
            userPreferences = await fetchUserFilterPreferences(user.id, countryId);
            console.log("BanknoteFilterCatalog: User preferences loaded", userPreferences);
          } catch (err) {
            console.error("Error fetching user preferences:", err);
          }
        }
        
        const requiredSortFields = sortOptionsData
          .filter(opt => opt.is_required)
          .map(opt => opt.field_name || '');
          
        if (userPreferences) {
          const sortFieldNames = userPreferences.selected_sort_options
            .map(sortId => {
              const option = sortOptionsData.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
          onFilterChange({
            categories: userPreferences.selected_categories,
            types: userPreferences.selected_types,
            sort: finalSortFields,
            country_id: countryId
          });
        } else {
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

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    console.log("BanknoteFilterCatalog: Filter change requested:", newFilters);
    
    const filtersWithCountryId = {
      ...newFilters,
      country_id: countryId
    };
    
    onFilterChange(filtersWithCountryId);
  };

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

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    onViewModeChange?.(newMode);
  };

  return (
    <div className="space-y-4">
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
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </div>
  );
};
