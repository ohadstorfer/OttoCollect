
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
import { cn } from "@/lib/utils";

interface BanknoteFilterCatalogProps {
  countryId: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
}

export const BanknoteFilterCatalog: React.FC<BanknoteFilterCatalogProps> = ({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onViewModeChange,
  groupMode = false,
  onGroupModeChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
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
        
        // Make sure we have all the necessary sort options
        let hasSultanOption = false;
        let hasFaceValueOption = false;
        let hasPickOption = false;
        
        const mappedSortOptions = sortOptionsData.map(sort => {
          if (sort.field_name === "sultan") hasSultanOption = true;
          if (sort.field_name === "faceValue") hasFaceValueOption = true;
          if (sort.field_name === "extPick") hasPickOption = true;
          
          return {
            id: sort.id,
            name: sort.name,
            fieldName: sort.field_name,
            isRequired: sort.is_required
          };
        });
        
        // Add default sort options if they don't exist
        if (!hasSultanOption) {
          mappedSortOptions.push({
            id: "sultan-default",
            name: "Sultan",
            fieldName: "sultan",
            isRequired: false
          });
        }
        
        if (!hasFaceValueOption) {
          mappedSortOptions.push({
            id: "facevalue-default",
            name: "Face Value",
            fieldName: "faceValue",
            isRequired: false
          });
        }
        
        if (!hasPickOption) {
          mappedSortOptions.push({
            id: "extpick-default",
            name: "Catalog Number",
            fieldName: "extPick",
            isRequired: true
          });
        }
        
        setCategories(mappedCategories);
        setTypes(mappedTypes);
        setSortOptions(mappedSortOptions);
        
        let userPreferences = null;
        let userGroupMode = false;
        if (user) {
          try {
            userPreferences = await fetchUserFilterPreferences(user.id, countryId);
            console.log("BanknoteFilterCatalog: User preferences loaded", userPreferences);
            if (userPreferences && userPreferences.group_mode !== undefined) {
              userGroupMode = userPreferences.group_mode;
              if (onGroupModeChange) {
                onGroupModeChange(userGroupMode);
              }
            }
          } catch (err) {
            console.error("Error fetching user preferences:", err);
          }
        }
        
        // Always ensure extPick is included in the sort options for fallback sorting
        const requiredSortFields = sortOptionsData
          .filter(opt => opt.is_required)
          .map(opt => opt.field_name || '');
          
        // Make sure extPick is always included as a fallback sort 
        if (!requiredSortFields.includes('extPick')) {
          requiredSortFields.push('extPick');
        }
          
        if (userPreferences) {
          const sortFieldNames = userPreferences.selected_sort_options
            .map(sortId => {
              const option = sortOptionsData.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
          
          // Ensure extPick is always included in the sort, after user choices
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
          // Set default filters if no user preferences are found
          const defaultCategoryIds = mappedCategories.map(cat => cat.id);
          const defaultTypeIds = mappedTypes
            .filter(type => type.name.toLowerCase().includes('issued'))
            .map(t => t.id);
            
          // For new users, default to sorting by extPick only since it comes pre-sorted from the DB
          const defaultSort = ['extPick']; // Remove faceValue from default sort
          
          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: defaultSort,
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
  }, [countryId, user, onFilterChange, toast, onGroupModeChange]);

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    if (newFilters.sort) {
      // Get only the required sort fields that must be included
      const requiredSortFields = sortOptions
        .filter(opt => opt.isRequired)
        .map(opt => opt.fieldName || '')
        .filter(Boolean);
      
      // Ensure extPick is always included as a fallback sort
      if (!requiredSortFields.includes('extPick') && !newFilters.sort.includes('extPick')) {
        newFilters.sort = [...newFilters.sort, 'extPick'];
      }
      
      // Add other required sort fields if they're missing
      requiredSortFields.forEach(fieldName => {
        if (!newFilters.sort.includes(fieldName)) {
          newFilters.sort.push(fieldName);
        }
      });
    }
    
    // Add country_id to filters
    const filtersWithCountryId = {
      ...newFilters,
      country_id: countryId
    };

    // Save user preferences automatically with each change
    if (user?.id) {
      console.log("BanknoteFilterCatalog: Auto-saving filter preferences");
      const sortOptionIds = filtersWithCountryId.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];

      saveUserFilterPreferences(
        user.id,
        countryId,
        filtersWithCountryId.categories || [],
        filtersWithCountryId.types || [],
        sortOptionIds,
        groupMode
      ).catch(error => {
        console.error("Error saving filter preferences:", error);
      });
    }
    
    onFilterChange(filtersWithCountryId);
  };
  
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };
  
  const handleGroupModeChange = (mode: boolean) => {
    if (onGroupModeChange) {
      onGroupModeChange(mode);
    }
    
    // Save the group mode preference to the database
    if (user?.id) {
      saveUserFilterPreferences(
        user.id,
        countryId,
        currentFilters.categories || [],
        currentFilters.types || [],
        currentFilters.sort
          .map(fieldName => {
            const option = sortOptions.find(opt => opt.fieldName === fieldName);
            return option ? option.id : null;
          })
          .filter(Boolean) as string[],
        mode
      ).catch(error => {
        console.error("Error saving group mode preference:", error);
      });
    }
  };

  return (
    <div className={cn(
      "w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-1.5",
      "sticky top-16 inset-x-0",
      className
    )}>
      <BaseBanknoteFilter
        categories={categories}
        types={types}
        sortOptions={sortOptions}
        onFilterChange={handleFilterChange}
        currentFilters={currentFilters}
        isLoading={isLoading || loading}
        className={className}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        groupMode={groupMode}
        onGroupModeChange={handleGroupModeChange}
      />
    </div>
  );
};
