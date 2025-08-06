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
import { BaseBanknoteFilterProfile } from "./BaseBanknoteFilterProfile";
import { CollectionItem } from "@/types";

export interface BanknoteFilterCollectionProps {
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
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing' | 'sale') => void;
  isOwner?: boolean;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  onBackToCountries?: () => void;
  collectionItems?: CollectionItem[];
  sortedCollectionItems?: CollectionItem[];
  sortedSaleItems?: CollectionItem[];
  sortedMissingItems?: CollectionItem[];
  sortedWishlistItems?: CollectionItem[];
}

// Use React.memo to prevent unnecessary re-renders
export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = memo(({
  countryId,
  countryName,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onViewModeChange,
  groupMode = false,
  onGroupModeChange,
  onPreferencesLoaded,
  activeTab,
  onTabChange,
  isOwner = false,
  profileUser,
  onBackToCountries,
  collectionItems,
  sortedCollectionItems,
  sortedSaleItems,
  sortedMissingItems,
  sortedWishlistItems
}) => {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
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
        if (authUser) {
          try {
            userPreferences = await fetchUserFilterPreferences(authUser.id, countryId);
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

            // Set view mode if it's defined in preferences, but only during initial load
            if (userPreferences && 
                userPreferences.view_mode && 
                onViewModeChange && 
                !initialLoadComplete.current) {
              
              console.log("BanknoteFilterCollection: Loading view mode from preferences:", userPreferences.view_mode);
              
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
            console.log("BanknoteFilterCollection: Checking session storage for view mode:", savedViewMode);
            if (savedViewMode && onViewModeChange && !initialLoadComplete.current) {
              const parsedViewMode = JSON.parse(savedViewMode) as 'grid' | 'list';
              console.log("BanknoteFilterCollection: Loaded view mode from session storage:", parsedViewMode);
              
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
  }, [countryId, authUser, onFilterChange, toast, onGroupModeChange, onPreferencesLoaded]); // groupMode removed from dependencies

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
    if (authUser?.id) {
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
        authUser.id,
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
  }, [onFilterChange, sortOptions, authUser, countryId, currentFilters, groupMode]);
  
  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    // If we're set to ignore the next change, skip this call
    if (ignoreNextViewModeChange.current) {
      ignoreNextViewModeChange.current = false;
      return;
    }
    
    // If the mode is the same as the current one, don't do anything
    if (mode === viewMode) return;
    
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    
    // Save view mode preference
    if (authUser && countryId) {
      console.log("BanknoteFilterCollection: Saving view mode preference:", mode);
      
      // Get current sort option IDs
      const sortOptionIds = currentFilters.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
      
      saveUserFilterPreferences(authUser.id, countryId, {
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
  }, [onViewModeChange, authUser, countryId, currentFilters, groupMode, viewMode, sortOptions]);
  
  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    // If we're set to ignore the next change, skip this call
    if (ignoreNextGroupModeChange.current) {
      ignoreNextGroupModeChange.current = false;
      return;
    }
    
    // If the mode is the same as the current one, don't do anything
    if (mode === groupMode) return;
    
    // Save group mode preference if user is logged in
    if (authUser?.id) {
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
        authUser.id,
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
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, groupMode, authUser, countryId, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions]);

  return (
    <div className={cn(
      "w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-1.5",
      "sticky top-16 inset-x-0",
      className
    )}>
      <BaseBanknoteFilterProfile
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
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOwner={isOwner}
        countryName={countryName}
        profileUser={profileUser}
        onBackToCountries={onBackToCountries}
        collectionItems={collectionItems}
        sortedCollectionItems={sortedCollectionItems}
        sortedSaleItems={sortedSaleItems}
        sortedMissingItems={sortedMissingItems}
        sortedWishlistItems={sortedWishlistItems}
      />
    </div>
  );
});

// Add a display name for the memoized component
BanknoteFilterCollection.displayName = 'BanknoteFilterCollection';
