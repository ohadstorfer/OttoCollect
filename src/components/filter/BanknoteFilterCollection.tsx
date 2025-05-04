
import React, { useState, useEffect, useRef, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchCollectionSortOptionsByCountryId } from "@/services/countryCatalogService";

interface BanknoteFilterCollectionProps {
  countryId?: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  // Collection-specific props
  collectionCategories?: { id: string; name: string; count?: number }[];
  collectionTypes?: { id: string; name: string; count?: number }[];
  // View mode & group mode props (same as BanknoteFilterCatalog)
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
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Add refs to track states and prevent render loops (same as BanknoteFilterCatalog)
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const isFetchingFilter = useRef(false);
  const lastUserId = useRef(""); // Track user ID instead of country ID for collection
  const lastCountryId = useRef(""); // Track country ID for sort options

  console.log("BanknoteFilterCollection: Rendering with", {
    countryId,
    userId: user?.id,
    currentFilters,
    collectionCategories: collectionCategories?.length,
    collectionTypes: collectionTypes?.length,
    groupMode
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
    
    // Load user preferences if user is logged in
    const loadUserPreferences = async () => {
      if (!user?.id) return;
      
      // Skip if we already loaded preferences for this user
      if (lastUserId.current === user.id && initialLoadComplete.current) {
        console.log("BanknoteFilterCollection: Already loaded preferences for this user, skipping");
        return;
      }
      
      try {
        // For collection, we could fetch user's collection preferences from session storage
        // or database if such API exists
        const storedViewMode = sessionStorage.getItem(`collectionViewMode-${user.id}`);
        if (storedViewMode) {
          const parsedViewMode = JSON.parse(storedViewMode) as 'grid' | 'list';
          setViewMode(parsedViewMode);
          if (onViewModeChange) {
            onViewModeChange(parsedViewMode);
          }
        }
        
        // Load group mode preference
        const storedGroupMode = sessionStorage.getItem(`collectionGroupMode-${user.id}`);
        if (storedGroupMode !== null && onGroupModeChange) {
          const parsedGroupMode = JSON.parse(storedGroupMode);
          
          // Set a flag to ignore the next group mode change to prevent infinite loops
          ignoreNextGroupModeChange.current = true;
          
          // Call the parent's onGroupModeChange if the stored value is different
          if (parsedGroupMode !== groupMode) {
            onGroupModeChange(parsedGroupMode);
          }
        }
        
        // Mark as complete to prevent repeated loads
        initialLoadComplete.current = true;
        lastUserId.current = user.id;
      } catch (err) {
        console.error("Error loading collection preferences:", err);
      }
    };
    
    loadUserPreferences();
  }, [user, collectionCategories, collectionTypes, onViewModeChange, onGroupModeChange, groupMode]);

  // New effect for loading sort options based on countryId
  useEffect(() => {
    const loadSortOptions = async () => {
      // Skip if no countryId provided or if already fetching
      if (!countryId || isFetchingFilter.current) {
        console.log("BanknoteFilterCollection: No countryId provided or already fetching, using default sort options");
        
        // Set default sort options if countryId is not provided
        setSortOptions([
          { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
          { id: "newest", name: "Newest First", fieldName: "newest" },
          { id: "sultan", name: "Sultan", fieldName: "sultan" },
          { id: "faceValue", name: "Face Value", fieldName: "faceValue" },
          { id: "condition", name: "Condition", fieldName: "condition" },
          { id: "purchaseDate", name: "Purchase Date", fieldName: "purchaseDate" }
        ]);
        return;
      }
      
      // Skip if we already loaded sort options for this country
      if (lastCountryId.current === countryId) {
        console.log("BanknoteFilterCollection: Already loaded sort options for this country, skipping");
        return;
      }
      
      console.log("BanknoteFilterCollection: Loading sort options for country", countryId);
      isFetchingFilter.current = true;
      
      try {
        // Fetch sort options from the API
        const sortOptionsData = await fetchCollectionSortOptionsByCountryId(countryId);
        
        console.log("BanknoteFilterCollection: Fetched sort options", sortOptionsData);
        
        // Make sure we have all the necessary sort options
        let hasSultanOption = false;
        let hasFaceValueOption = false;
        let hasPickOption = false;
        let hasConditionOption = false;
        let hasPurchaseDateOption = false;
        
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
        
        // Add collection-specific sort options if they don't exist
        if (!hasConditionOption) {
          mappedSortOptions.push({
            id: "condition-default",
            name: "Condition",
            fieldName: "condition",
            isRequired: false
          });
        }
        
        if (!hasPurchaseDateOption) {
          mappedSortOptions.push({
            id: "purchaseDate-default",
            name: "Purchase Date",
            fieldName: "purchaseDate",
            isRequired: false
          });
        }
        
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
        
        setSortOptions(mappedSortOptions);
        lastCountryId.current = countryId;
      } catch (error) {
        console.error("Error loading sort options:", error);
        toast({
          title: "Error",
          description: "Failed to load sort options.",
          variant: "destructive",
        });
        
        // Set default sort options on error
        setSortOptions([
          { id: "extPick", name: "Catalog Number", fieldName: "extPick", isRequired: true },
          { id: "newest", name: "Newest First", fieldName: "newest" },
          { id: "sultan", name: "Sultan", fieldName: "sultan" },
          { id: "faceValue", name: "Face Value", fieldName: "faceValue" },
          { id: "condition", name: "Condition", fieldName: "condition" },
          { id: "purchaseDate", name: "Purchase Date", fieldName: "purchaseDate" }
        ]);
      } finally {
        isFetchingFilter.current = false;
        setLoading(false);
      }
    };

    loadSortOptions();
  }, [countryId, toast]);

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
      try {
        // Store filters in session storage as a simple way to persist between page loads
        sessionStorage.setItem(`collectionFilters-${user.id}`, JSON.stringify({
          categories: newFilters.categories || currentFilters.categories || [],
          types: newFilters.types || currentFilters.types || [],
          sort: newFilters.sort || currentFilters.sort || []
        }));
      } catch (e) {
        console.error("Unable to store collection filters in session storage:", e);
      }
    }
    
    onFilterChange(newFilters);
  }, [onFilterChange, sortOptions, user, currentFilters]);
  
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
      try {
        sessionStorage.setItem(`collectionGroupMode-${user.id}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store group mode in session storage:", e);
      }
    }
    
    if (onGroupModeChange) {
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, groupMode, user]);

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
      // Store in session storage (or database if API available)
      sessionStorage.setItem(`collectionFilters-${user.id}`, JSON.stringify({
        categories: currentFilters.categories || [],
        types: currentFilters.types || [],
        sort: currentFilters.sort || []
      }));
      
      toast({
        title: "Success",
        description: "Collection filter preferences saved.",
      });
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
