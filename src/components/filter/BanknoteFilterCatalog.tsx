import React, { useState, useEffect, useRef, memo, useMemo } from "react";
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
import { useTranslation } from "react-i18next";

interface BanknoteFilterCatalogProps {
  countryId: string;
  countryName: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
  onPreferencesLoaded?: () => void;
  countryNameAr?: string;
  countryNameTr?: string;
}

// Custom comparison function to ensure re-renders when viewMode or groupMode change
const areEqual = (prevProps: BanknoteFilterCatalogProps, nextProps: BanknoteFilterCatalogProps) => {
  // Always re-render if groupMode changes
  if (prevProps.groupMode !== nextProps.groupMode) {
    console.log('BanknoteFilterCatalog: Re-rendering due to groupMode change', {
      prevGroupMode: prevProps.groupMode,
      nextGroupMode: nextProps.groupMode
    });
    return false;
  }
  
  // Re-render if other important props change
  if (prevProps.countryId !== nextProps.countryId || 
      prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  
  return true;
};

// Use React.memo with custom comparison to ensure re-renders when viewMode or groupMode change
export const BanknoteFilterCatalog: React.FC<BanknoteFilterCatalogProps> = memo(({
  countryId,
  countryName,
  countryNameAr,
  countryNameTr,
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
  const { t } = useTranslation(['filter']);
  
  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Add refs to track states and prevent render loops
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const ignoreNextViewModeChange = useRef(false);
  const isFetchingFilter = useRef(false);
  const lastCountryId = useRef("");
  const lastUserState = useRef<string | null>(null); // Track user state changes

  useEffect(() => {
    const currentUserState = user?.id || null;
    
    // Skip if no countryId or if we're already fetching
    if (!countryId || isFetchingFilter.current) {
      return;
    }
    
    // Reset state if user changed (from null to user or vice versa)
    if (lastUserState.current !== currentUserState) {
      initialLoadComplete.current = false;
      lastCountryId.current = "";
      lastUserState.current = currentUserState;
    }
    
    // Skip if we already loaded options for this country
    if (lastCountryId.current === countryId && initialLoadComplete.current) {
      return;
    }
    
    const loadFilterOptionsAndPreferences = async () => {
      setLoading(true);
      isFetchingFilter.current = true;
      
      try {
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);
        
        const mappedCategories = categoriesData
          .filter(cat => cat.name !== tWithFallback('categories.unlistedBanknotes', 'Unlisted Banknotes'))
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            name_ar: cat.name_ar,
            name_tr: cat.name_tr,
          }));
        
        const mappedTypes = typesData.map(type => ({
          id: type.id,
          name: type.name,
          name_ar: type.name_ar,
          name_tr: type.name_tr,
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
            name_ar: sort.name_ar,
            name_tr: sort.name_tr,
            fieldName: sort.field_name,
            isRequired: sort.is_required
          };
        });
        
        if (!hasFaceValueOption) {
          mappedSortOptions.push({
                    id: "facevalue-default",
        name: tWithFallback('sort.faceValue', 'Face Value'),
        name_ar: tWithFallback('sort.faceValue', 'Face Value'),
        name_tr: tWithFallback('sort.faceValue', 'Face Value'),
        fieldName: "faceValue",
            isRequired: false
          });
        }
        
        if (!hasPickOption) {
          mappedSortOptions.push({
                    id: "extpick-default",
        name_ar: tWithFallback('sort.catalogNumber', 'Catalog Number'),
        name_tr: tWithFallback('sort.catalogNumber', 'Catalog Number'),
        name: tWithFallback('sort.catalogNumber', 'Catalog Number'),
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
            // Set group mode if it's defined in preferences, but only during initial load
            if (userPreferences && 
                typeof userPreferences.group_mode === 'boolean' && 
                onGroupModeChange && 
                userPreferences.group_mode !== groupMode && 
                !initialLoadComplete.current) {
              
              ignoreNextGroupModeChange.current = true;
              onGroupModeChange(userPreferences.group_mode);
            }

            // Set view mode if it's defined in preferences, but only during initial load
            if (userPreferences && 
                userPreferences.view_mode && 
                onViewModeChange && 
                !initialLoadComplete.current) {
              
              // Set a flag to ignore the next view mode change to prevent infinite loops
              ignoreNextViewModeChange.current = true;
              
              setViewMode(userPreferences.view_mode);
              onViewModeChange(userPreferences.view_mode);
            }
          } catch (err) {
            console.error("Error fetching user preferences:", err);
          }
        } else {
          // For non-logged-in users, try to load from session storage
          try {
            const savedViewMode = sessionStorage.getItem(`viewMode-${countryId}`);
            if (savedViewMode && onViewModeChange && !initialLoadComplete.current) {
              const parsedViewMode = JSON.parse(savedViewMode) as 'grid' | 'list';
              
              ignoreNextViewModeChange.current = true;
              setViewMode(parsedViewMode);
              onViewModeChange(parsedViewMode);
            }
          } catch (err) {
            console.error("Error loading view mode from session storage:", err);
          }
        }
        
        // Always ensure extPick is included in the sort options for fallback sorting
        const requiredSortFields = sortOptionsData
          .filter(opt => opt.is_required)
          .map(opt => opt.field_name || '');
          
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
          
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
          onFilterChange({
            categories: userPreferences.selected_categories,
            types: userPreferences.selected_types,
            sort: finalSortFields,
          });
        } else if (!initialLoadComplete.current && !user) {
          // Only apply defaults if there's no user (not logged in)
          const defaultCategoryIds = mappedCategories.map(cat => cat.id);
          const defaultTypeIds = mappedTypes
            .filter(type => type.name.toLowerCase().includes('issued'))
            .map(t => t.id);
            
          const defaultSort = ['extPick'];
          
          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: defaultSort,
          });
        } else if (!initialLoadComplete.current && user && !userPreferences) {
          // User is logged in but has no preferences - apply defaults
          const defaultCategoryIds = mappedCategories.map(cat => cat.id);
          const defaultTypeIds = mappedTypes
            .filter(type => type.name.toLowerCase().includes('issued'))
            .map(t => t.id);
            
          const defaultSort = ['extPick'];
          
          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: defaultSort,
          });
        }
        
        // Mark as complete to prevent repeated loads and clear ignore flags
        initialLoadComplete.current = true;
        ignoreNextViewModeChange.current = false;
        ignoreNextGroupModeChange.current = false;
        lastCountryId.current = countryId;
        
        // Call onPreferencesLoaded callback when everything is ready
        if (onPreferencesLoaded) {
          onPreferencesLoaded();
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
        toast({
          title: tWithFallback('errors.failedToLoadPreferences', 'Error'),
          description: tWithFallback('errors.failedToLoadPreferences', 'Failed to load filter options.'),
          variant: "destructive",
        });
        
        // Even on error, call onPreferencesLoaded to prevent hanging
        if (onPreferencesLoaded) {
          onPreferencesLoaded();
        }
      } finally {
        setLoading(false);
        isFetchingFilter.current = false;
      }
    };

    loadFilterOptionsAndPreferences();
    // groupMode is NOT included in the dependency array because it would cause infinite loops
  }, [countryId, user, onFilterChange, toast, onGroupModeChange]); // Removed onPreferencesLoaded from dependencies to prevent re-runs

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
        {
          selected_categories: newFilters.categories || currentFilters.categories || [],
          selected_types: newFilters.types || currentFilters.types || [],
          selected_sort_options: sortOptionIds,
          group_mode: groupMode || false
        }
      ).catch(error => {
        console.error("Error saving filter preferences:", error);
      });
    }
    
    onFilterChange(newFilters);
  }, [onFilterChange, sortOptions, user, countryId, currentFilters, groupMode]);
  
  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    // If we're set to ignore the next change and still in initial load, skip this call
    if (ignoreNextViewModeChange.current && !initialLoadComplete.current) {
      ignoreNextViewModeChange.current = false;
      console.log("BanknoteFilterCatalog: Ignoring view mode change during initial load to prevent loop");
      return;
    }
    
    // Clear the ignore flag if we're past initial load (user interaction)
    if (initialLoadComplete.current) {
      ignoreNextViewModeChange.current = false;
    }
    
    console.log("BanknoteFilterCatalog: handleViewModeChange called with mode:", mode, "current viewMode:", viewMode);
    setViewMode(mode);
    if (onViewModeChange) {
      console.log("BanknoteFilterCatalog: Calling parent onViewModeChange with mode:", mode);
      onViewModeChange(mode);
    }
    
    // Save view mode preference
    if (user && countryId) {
      console.log("BanknoteFilterCatalog: Saving view mode preference:", mode);
      
      // Get current sort option IDs
      const sortOptionIds = currentFilters.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
      
      saveUserFilterPreferences(user.id, countryId, {
        selected_categories: currentFilters.categories || [],
        selected_types: currentFilters.types || [],
        selected_sort_options: sortOptionIds,
        group_mode: groupMode || false,
        view_mode: mode
      }).catch(err => {
        console.error("Error saving view mode preference:", err);
      });
    } else {
      // For non-logged-in users, store in session storage
      try {
        sessionStorage.setItem(`viewMode-${countryId}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store view mode in session storage:", e);
      }
    }
  }, [onViewModeChange, user, countryId, currentFilters, groupMode, sortOptions]);
  
  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    // If we're set to ignore the next change and still in initial load, skip this call
    if (ignoreNextGroupModeChange.current && !initialLoadComplete.current) {
      ignoreNextGroupModeChange.current = false;
      console.log("BanknoteFilterCatalog: Ignoring group mode change during initial load to prevent loop");
      return;
    }
    
    // Clear the ignore flag if we're past initial load (user interaction)
    if (initialLoadComplete.current) {
      ignoreNextGroupModeChange.current = false;
    }
    
    console.log("BanknoteFilterCatalog: handleGroupModeChange called with mode:", mode, "current groupMode:", groupMode);
    
    // Save group mode preference if user is logged in
    if (user?.id) {
      console.log("BanknoteFilterCatalog: Saving group mode preference:", mode);
      
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
        {
          selected_categories: currentFilters.categories || [],
          selected_types: currentFilters.types || [],
          selected_sort_options: sortOptionIds,
          group_mode: mode
        }
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
      console.log("BanknoteFilterCatalog: Calling parent onGroupModeChange with mode:", mode);
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, user, countryId, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions]);

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
        countryName={countryName}
        countryNameAr={countryNameAr}
        countryNameTr={countryNameTr}
      />
    </div>
  );
}, areEqual);

// Add a display name for the memoized component
BanknoteFilterCatalog.displayName = 'BanknoteFilterCatalog';
