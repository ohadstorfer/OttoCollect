
import React, { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  fetchCollectionSortOptionsByCountryId,
  fetchCollectionFilterPreferences,
  saveCollectionFilterPreferences
} from "@/services/collectionService";

interface BanknoteFilterCollectionProps {
  countryId?: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  // Collection-specific props
  collectionCategories?: { id: string; name: string; count?: number }[];
  collectionTypes?: { id: string; name: string; count?: number }[];
  // View mode & group mode props
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
}

// Use React.memo to prevent unnecessary re-renders
export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = memo(({
  countryId,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  collectionCategories = [],
  collectionTypes = [],
  onViewModeChange,
  groupMode = false,
  onGroupModeChange
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Add refs to track states and prevent render loops (same as BanknoteFilterCatalog)
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const isFetchingFilter = useRef(false);
  const lastUserId = useRef("");
  const lastCountryId = useRef("");

  console.log("BanknoteFilterCollection: Rendering with", {
    countryId,
    userId: user?.id,
    currentFilters,
    collectionCategories: collectionCategories?.length,
    collectionTypes: collectionTypes?.length,
    groupMode,
    loading
  });

  useEffect(() => {
    // For collection filtering, if we have collectionCategories and collectionTypes directly provided,
    // we can set them directly without fetching from server
    
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
  }, [collectionCategories, collectionTypes]);

  // Load user preferences and sort options
  useEffect(() => {
    const loadUserPreferencesAndSortOptions = async () => {
      if (!user?.id) {
        console.log("BanknoteFilterCollection: No user, skipping preference load");
        setLoading(false);
        return;
      }

      // Skip if we've already loaded for this user/country combination
      const currentCountryId = countryId || 'all';
      if (
        lastUserId.current === user.id &&
        lastCountryId.current === currentCountryId &&
        initialLoadComplete.current
      ) {
        console.log("BanknoteFilterCollection: Already loaded for this user/country, skipping");
        setLoading(false);
        return;
      }

      // Start loading
      setLoading(true);
      isFetchingFilter.current = true;
      
      try {
        console.log("BanknoteFilterCollection: Loading preferences and sort options");
        
        // Fetch sort options first
        let fetchedSortOptions;
        if (countryId) {
          fetchedSortOptions = await fetchCollectionSortOptionsByCountryId(countryId);
        } else {
          // Use default sort options when no country ID is provided
          fetchedSortOptions = [
            { id: "extPick", name: "Catalog Number", field_name: "extPick", is_required: true, is_default: true },
            { id: "newest", name: "Newest First", field_name: "newest", is_default: false, is_required: false },
            { id: "sultan", name: "Sultan", field_name: "sultan", is_default: false, is_required: false },
            { id: "faceValue", name: "Face Value", field_name: "faceValue", is_default: false, is_required: false },
            { id: "condition", name: "Condition", field_name: "condition", is_default: false, is_required: false },
            { id: "purchaseDate", name: "Purchase Date", field_name: "purchaseDate", is_default: false, is_required: false }
          ];
        }
        
        // Map the sort options to the expected format
        const mappedSortOptions = fetchedSortOptions.map(option => ({
          id: option.id,
          name: option.name,
          fieldName: option.field_name,
          isRequired: option.is_required || false
        }));
        
        setSortOptions(mappedSortOptions);
        
        // Now fetch user preferences
        const preferences = await fetchCollectionFilterPreferences(user.id, countryId);
        
        if (preferences) {
          console.log("BanknoteFilterCollection: User preferences loaded:", preferences);
          
          // Set group mode if it's defined in preferences
          if (typeof preferences.group_mode === 'boolean' && onGroupModeChange) {
            // Set a flag to ignore the next group mode change to prevent infinite loops
            ignoreNextGroupModeChange.current = true;
            
            // Call the parent's onGroupModeChange
            if (preferences.group_mode !== groupMode) {
              onGroupModeChange(preferences.group_mode);
            }
          }
          
          // Map sort option IDs to field names
          const sortFieldNames = preferences.selected_sort_options
            .map(sortId => {
              const option = fetchedSortOptions.find(opt => opt.id === sortId);
              return option ? option.field_name : null;
            })
            .filter(Boolean) as string[];
            
          // Ensure required sort fields are included
          const requiredSortFields = fetchedSortOptions
            .filter(opt => opt.is_required)
            .map(opt => opt.field_name);
            
          const finalSortFields = Array.from(
            new Set([...sortFieldNames, ...requiredSortFields])
          );
          
          // Update the filters based on user preferences
          onFilterChange({
            categories: preferences.selected_categories.length > 0 ? preferences.selected_categories : [],
            types: preferences.selected_types.length > 0 ? preferences.selected_types : [],
            sort: finalSortFields.length > 0 ? finalSortFields : ['extPick'],
          });
        } else {
          console.log("BanknoteFilterCollection: No saved preferences, using defaults");
          
          // Set default options if no preferences are found
          const defaultCategoryIds = categories.map(cat => cat.id);
          const defaultTypeIds = types
            .filter(type => type.name.toLowerCase().includes('issued'))
            .map(t => t.id);
            
          // For new users, default to sorting by extPick
          const defaultSort = ['extPick']; 
          
          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: defaultSort,
          });
        }
        
        // Load view mode from session storage as a fallback
        try {
          const storedViewMode = sessionStorage.getItem(`collectionViewMode-${user.id}`);
          if (storedViewMode) {
            const parsedViewMode = JSON.parse(storedViewMode) as 'grid' | 'list';
            setViewMode(parsedViewMode);
            if (onViewModeChange) {
              onViewModeChange(parsedViewMode);
            }
          }
        } catch (e) {
          console.error("Error loading view mode from session storage:", e);
        }
        
        // Mark as complete to prevent repeated loads
        initialLoadComplete.current = true;
        lastUserId.current = user.id;
        lastCountryId.current = currentCountryId;
        
      } catch (error) {
        console.error("BanknoteFilterCollection: Error loading preferences or sort options:", error);
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
    
    loadUserPreferencesAndSortOptions();
  }, [user, countryId, toast, onFilterChange, onGroupModeChange, groupMode, categories, types]);

  // Handle filter changes - memoize to prevent unnecessary re-renders
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
      
      // Map sort field names back to sort option IDs
      const sortOptionIds = (newFilters.sort || currentFilters.sort || [])
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
        
      // Save to database
      saveCollectionFilterPreferences(
        user.id,
        countryId || null,
        newFilters.categories || currentFilters.categories || [],
        newFilters.types || currentFilters.types || [],
        sortOptionIds,
        groupMode
      ).catch(error => {
        console.error("Error saving collection filter preferences:", error);
      });
    }
    
    onFilterChange(newFilters);
  }, [onFilterChange, sortOptions, user, currentFilters, countryId, groupMode]);
  
  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    
    // Save preference
    if (user?.id) {
      try {
        sessionStorage.setItem(`collectionViewMode-${user.id}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store view mode preference:", e);
      }
    }
    
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  }, [onViewModeChange, user]);
  
  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    // If we're set to ignore the next change, skip this call
    if (ignoreNextGroupModeChange.current) {
      ignoreNextGroupModeChange.current = false;
      return;
    }
    
    // If the mode is the same as the current one, don't do anything
    if (mode === groupMode) return;
    
    // Save group mode preference
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
      saveCollectionFilterPreferences(
        user.id,
        countryId || null,
        currentFilters.categories || [],
        currentFilters.types || [],
        sortOptionIds,
        mode
      ).catch(error => {
        console.error("Error saving group mode preference:", error);
      });
    } else {
      // For non-logged-in users, store in session storage
      try {
        sessionStorage.setItem(`collectionGroupMode-${user?.id || 'anonymous'}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store group mode in session storage:", e);
      }
    }
    
    if (onGroupModeChange) {
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, groupMode, user, countryId, currentFilters, sortOptions]);

  // Save filters function - can be used for explicit saves
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
    
    try {
      // Map sort field names to sort option IDs
      const sortOptionIds = currentFilters.sort
        .map(fieldName => {
          const option = sortOptions.find(opt => opt.fieldName === fieldName);
          return option ? option.id : null;
        })
        .filter(Boolean) as string[];
        
      const success = await saveCollectionFilterPreferences(
        user.id,
        countryId || null,
        currentFilters.categories || [],
        currentFilters.types || [],
        sortOptionIds,
        groupMode
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "Collection filter preferences saved.",
        });
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving filter preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save filter preferences.",
        variant: "destructive",
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
        onSaveFilters={handleSaveFilters}
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
