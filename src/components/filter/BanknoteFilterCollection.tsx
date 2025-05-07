import React, { useState, useEffect, useRef, memo } from "react";
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

interface BanknoteFilterCollectionProps {
  countryId: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
  onPreferencesLoaded?: () => void;
}

// Use React.memo to prevent unnecessary re-renders
export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = memo(({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onViewModeChange,
  groupMode = false,
  onGroupModeChange,
  onPreferencesLoaded
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Add refs to track states and prevent render loops
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const isFetchingFilter = useRef(false);
  const lastCountryId = useRef("");

  console.log("BanknoteFilterCollection: Rendering with", { 
    countryId, 
    currentFilters,
    isLoading, 
    loading,
    categories: categories.length,
    types: types.length,
    sortOptions: sortOptions.length,
    groupMode
  });

  useEffect(() => {
    // Skip if no countryId or if we're already fetching
    if (!countryId || isFetchingFilter.current) return;
    
    // Skip if we already loaded options for this country
    if (lastCountryId.current === countryId && initialLoadComplete.current) {
      console.log("BanknoteFilterCollection: Already loaded options for this country, skipping");
      return;
    }
    
    const loadFilterOptionsAndPreferences = async () => {
      console.log("BanknoteFilterCollection: Loading filter options for country:", countryId);
      setLoading(true);
      isFetchingFilter.current = true;
      
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
        if (user) {
          try {
            userPreferences = await fetchUserFilterPreferences(user.id, countryId);
            console.log("BanknoteFilterCollection: User preferences loaded", userPreferences);
            
            // Set group mode if it's defined in preferences, but only during initial load
            // and only notify the parent if the value is different from current groupMode
            if (userPreferences && 
                typeof userPreferences.group_mode === 'boolean' && 
                onGroupModeChange && 
                userPreferences.group_mode !== groupMode && 
                !initialLoadComplete.current) {
              
              // Set a flag to ignore the next group mode change to prevent infinite loops
              ignoreNextGroupModeChange.current = true;
              
              // Call the parent's onGroupModeChange
              onGroupModeChange(userPreferences.group_mode);
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
          
        if (userPreferences && !initialLoadComplete.current) {
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
          });

          // Notify parent that preferences are loaded
          if (onPreferencesLoaded) {
            onPreferencesLoaded();
          }
        } else if (!initialLoadComplete.current) {
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
          });

          // Notify parent that preferences are loaded, even with defaults
          if (onPreferencesLoaded) {
            onPreferencesLoaded();
          }
        }
        
        // Mark as complete to prevent repeated loads
        initialLoadComplete.current = true;
        lastCountryId.current = countryId;
      } catch (error) {
        console.error("Error loading filter options:", error);
        toast({
          title: "Error",
          description: "Failed to load filter options.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        isFetchingFilter.current = false;
      }
    };

    loadFilterOptionsAndPreferences();
    // groupMode is NOT included in the dependency array because it would cause infinite loops
  }, [countryId, user, onFilterChange, toast, onGroupModeChange, onPreferencesLoaded]); // groupMode removed from dependencies

  const handleFilterChange = React.useCallback((newFilters: Partial<DynamicFilterState>) => {
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

    // Save user preferences automatically with each change
    if (user?.id) {
      console.log("BanknoteFilterCollection: Auto-saving filter preferences");
      const sortOptionIds = newFilters.sort
        ? newFilters.sort
            .map(fieldName => {
              const option = sortOptions.find(opt => opt.fieldName === fieldName);
              return option ? option.id : null;
            })
            .filter(Boolean) as string[]
        : currentFilters.sort
            .map(fieldName => {
              const option = sortOptions.find(opt => opt.fieldName === fieldName);
              return option ? option.id : null;
            })
            .filter(Boolean) as string[];

      saveUserFilterPreferences(
        user.id,
        countryId,
        newFilters.categories || currentFilters.categories || [],
        newFilters.types || currentFilters.types || [],
        sortOptionIds,
        groupMode // Pass current groupMode value
      ).catch(error => {
        console.error("Error saving filter preferences:", error);
      });
    }
    
    onFilterChange(newFilters);
  }, [onFilterChange, sortOptions, user, countryId, currentFilters, groupMode]);
  
  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  }, [onViewModeChange]);
  
  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    // If we're set to ignore the next change, skip this call
    if (ignoreNextGroupModeChange.current) {
      ignoreNextGroupModeChange.current = false;
      return;
    }
    
    // If the mode is the same as the current one, don't do anything
    if (mode === groupMode) return;
    
    // Save group mode preference if user is logged in
    if (user?.id) {
      console.log("BanknoteFilterCollection: Saving group mode preference:", mode);
      
      // Get current sort option IDs
      const sortOptionIds = currentFilters.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
      
      // Save all preferences including group mode
      saveUserFilterPreferences(
        user.id,
        countryId,
        currentFilters.categories || [],
        currentFilters.types || [],
        sortOptionIds,
        mode // Pass the new group mode value
      ).catch(error => {
        console.error("Error saving group mode preference:", error);
      });
    } else {
      // For non-logged-in users, store in session storage
      try {
        sessionStorage.setItem(`groupMode-${countryId}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store group mode in session storage:", e);
      }
    }
    
    if (onGroupModeChange) {
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, groupMode, user, countryId, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions]);

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
});

// Add a display name for the memoized component
BanknoteFilterCollection.displayName = 'BanknoteFilterCollection';
