import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { 
  fetchCategoriesByCountryId, 
  fetchTypesByCountryId, 
  fetchSortOptionsByCountryId,
  saveUserFilterPreferences,
  fetchUserFilterPreferences,
  fetchCountryDefaultPreferences
} from "@/services/countryService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BaseBanknoteFilterProfile } from "./BaseBanknoteFilterProfile";
import { CollectionItem } from "@/types";
import { useTranslation } from "react-i18next";

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
  currencies?: any[];
  categoryOrder?: any[];
  getFlattenedItemsForExport?: (activeTab: string) => CollectionItem[];
  countryNameAr?: string;
  countryNameTr?: string;
  preferencesLoaded?: boolean;
}

// Custom comparison function to ensure re-renders when viewMode or groupMode change
const areEqual = (prevProps: BanknoteFilterCollectionProps, nextProps: BanknoteFilterCollectionProps) => {
  // Always re-render if groupMode change
  if (prevProps.groupMode !== nextProps.groupMode) {
    
    return false;
  }
  
  // Re-render if other important props change
  if (prevProps.countryId !== nextProps.countryId || 
      prevProps.activeTab !== nextProps.activeTab ||
      prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  
  return true;
};

// Use React.memo with custom comparison to ensure re-renders when viewMode or groupMode change
export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = memo(({
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
  sortedWishlistItems,
  currencies = [],
  categoryOrder = [],
  getFlattenedItemsForExport,
  preferencesLoaded: externalPreferencesLoaded = false
}) => {
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuth();
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
  const [internalPreferencesLoaded, setInternalPreferencesLoaded] = useState(false);
  
  // Use external preferencesLoaded if provided, otherwise use internal one
  const preferencesLoaded = externalPreferencesLoaded || internalPreferencesLoaded;
  
  
  // Add refs to track states and prevent render loops
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const ignoreNextViewModeChange = useRef(false);
  const lastCountryId = useRef("");
  const lastUserState = useRef<string | null>(null); // Track viewer auth state changes
  // Monotonic token identifying the latest load. A stale in-flight load
  // discards its results so a newer (country, user) load always wins.
  const loadGeneration = useRef(0);



  useEffect(() => {
    if (!countryId) return;
    // Wait until auth resolves so we don't apply anonymous defaults first and
    // then re-run once the real viewer arrives (flash + lost-preferences feel).
    if (authLoading) return;
    const currentUserState = authUser?.id || null;

    // Reset the completion flag whenever the (country, user) key changes so a
    // fresh load runs for the new key. Previously a load that completed while
    // anonymous was never refreshed once `authUser` resolved, leaving the
    // viewer's saved preferences unapplied.
    if (lastUserState.current !== currentUserState || lastCountryId.current !== countryId) {
      initialLoadComplete.current = false;
    }

    // Already fully loaded for this exact (country, user): nothing to do.
    if (lastCountryId.current === countryId &&
        lastUserState.current === currentUserState &&
        initialLoadComplete.current) {
      return;
    }

    // Claim this run; any previous in-flight load discards its results via the
    // generation checks below instead of being silently dropped.
    const myGeneration = ++loadGeneration.current;
    lastUserState.current = currentUserState;
    lastCountryId.current = countryId;

    const loadFilterOptionsAndPreferences = async () => {
      setLoading(true);

      try {
        const [categoriesData, typesData, sortOptionsData] = await Promise.all([
          fetchCategoriesByCountryId(countryId),
          fetchTypesByCountryId(countryId),
          fetchSortOptionsByCountryId(countryId)
        ]);

        // A newer load started while we awaited: abandon this stale one.
        if (myGeneration !== loadGeneration.current) return;

        const mappedCategories = categoriesData.map(cat => ({
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
        
        // Add default sort options if they don't exist
        
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
        name: tWithFallback('sort.catalogNumber', 'Catalog Number'),
        name_ar: tWithFallback('sort.catalogNumber', 'Catalog Number'),
        name_tr: tWithFallback('sort.catalogNumber', 'Catalog Number'),
        fieldName: "extPick",
            isRequired: true
          });
        }
        
        setCategories(mappedCategories);
        setTypes(mappedTypes);
        setSortOptions(mappedSortOptions);
        
        let userPreferences = null;
        // Admin-configured defaults for brand-new users. Used as the fallback
        // when a logged-in viewer has NO saved row yet (instead of hardcoded
        // "all"). Never overrides an existing row.
        let newUserDefaults: Awaited<ReturnType<typeof fetchCountryDefaultPreferences>> = null;
        if (authUser) {
          try {
            userPreferences = await fetchUserFilterPreferences(authUser.id, countryId);
            // Abandon if a newer (country, user) load superseded us mid-fetch.
            if (myGeneration !== loadGeneration.current) return;

            // No saved row yet: fall back to the admin 'new_user' defaults so
            // admin-defined defaults reach users who never customized.
            if (!userPreferences) {
              try {
                newUserDefaults = await fetchCountryDefaultPreferences(countryId, 'new_user');
              } catch (err) {
                console.error("Error loading country new_user defaults:", err);
              }
              if (myGeneration !== loadGeneration.current) return;
            }

            // Group mode: prefer the user's row, fall back to admin defaults.
            const resolvedGroupMode =
              userPreferences && typeof userPreferences.group_mode === 'boolean'
                ? userPreferences.group_mode
                : (newUserDefaults && typeof newUserDefaults.group_mode === 'boolean'
                    ? newUserDefaults.group_mode
                    : undefined);
            if (typeof resolvedGroupMode === 'boolean' &&
                onGroupModeChange &&
                resolvedGroupMode !== groupMode &&
                !initialLoadComplete.current) {
              ignoreNextGroupModeChange.current = true;
              onGroupModeChange(resolvedGroupMode);
            }

            // View mode: prefer the user's row, fall back to admin defaults.
            const resolvedViewMode =
              (userPreferences && userPreferences.view_mode)
                ? userPreferences.view_mode
                : (newUserDefaults && newUserDefaults.view_mode
                    ? newUserDefaults.view_mode
                    : undefined);
            if (resolvedViewMode &&
                onViewModeChange &&
                !initialLoadComplete.current) {
              ignoreNextViewModeChange.current = true;
              setViewMode(resolvedViewMode);
              onViewModeChange(resolvedViewMode);
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
          
        // Make sure extPick is always included as a fallback sort 
        if (!requiredSortFields.includes('extPick')) {
          requiredSortFields.push('extPick');
        }
          
        if (userPreferences && !initialLoadComplete.current) {
          // Validate saved IDs against the country's CURRENT definitions.
          // If the admin edited/recreated categories or types their UUIDs
          // change, leaving the user's saved IDs orphaned -> the collection
          // would filter down to nothing and render empty. Fall back to "all"
          // when the saved selection no longer matches anything.
          const validCategoryIds = new Set(mappedCategories.map(c => c.id));
          const validTypeIds = new Set(mappedTypes.map(t => t.id));
          const validUserCategories = (userPreferences.selected_categories || [])
            .filter(id => validCategoryIds.has(id));
          const validUserTypes = (userPreferences.selected_types || [])
            .filter(id => validTypeIds.has(id));
          const resolvedCategories = validUserCategories.length > 0
            ? validUserCategories
            : mappedCategories.map(cat => cat.id);
          const resolvedTypes = validUserTypes.length > 0
            ? validUserTypes
            : mappedTypes.map(t => t.id);

          const sortFieldNames = (userPreferences.selected_sort_options || [])
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
            categories: resolvedCategories,
            types: resolvedTypes,
            sort: finalSortFields,
          });

          // Notify parent that preferences are loaded
          if (onPreferencesLoaded) {
            onPreferencesLoaded();
          }
          
          // Mark preferences as loaded
          setInternalPreferencesLoaded(true);
        } else if (!initialLoadComplete.current) {
          // No saved row. For a logged-in viewer apply the admin 'new_user'
          // defaults if set; otherwise (or for anonymous viewers) fall back to
          // "all selected".
          let defaultCategoryIds = mappedCategories.map(cat => cat.id);
          let defaultTypeIds = mappedTypes.map(t => t.id);
          let defaultSort: string[] = ['extPick'];

          if (authUser && newUserDefaults) {
            if (Array.isArray(newUserDefaults.selected_categories) && newUserDefaults.selected_categories.length > 0) {
              const valid = new Set(mappedCategories.map(c => c.id));
              const filtered = newUserDefaults.selected_categories.filter(id => valid.has(id));
              if (filtered.length > 0) defaultCategoryIds = filtered;
            }
            if (Array.isArray(newUserDefaults.selected_types) && newUserDefaults.selected_types.length > 0) {
              const valid = new Set(mappedTypes.map(t => t.id));
              const filtered = newUserDefaults.selected_types.filter(id => valid.has(id));
              if (filtered.length > 0) defaultTypeIds = filtered;
            }
            if (Array.isArray(newUserDefaults.selected_sort_options) && newUserDefaults.selected_sort_options.length > 0) {
              const fieldNames = newUserDefaults.selected_sort_options
                .map(sortId => {
                  const option = sortOptionsData.find(opt => opt.id === sortId);
                  return option ? option.field_name : null;
                })
                .filter(Boolean) as string[];
              if (fieldNames.length > 0) {
                defaultSort = Array.from(new Set([...fieldNames, ...requiredSortFields]));
              }
            }
          }

          onFilterChange({
            categories: defaultCategoryIds,
            types: defaultTypeIds,
            sort: defaultSort,
          });

          // Notify parent that preferences are loaded, even with defaults
          if (onPreferencesLoaded) {
            onPreferencesLoaded();
          }
          
          // Mark preferences as loaded
          setInternalPreferencesLoaded(true);
        }
        
        // Mark as complete to prevent repeated loads and clear ignore flags
        initialLoadComplete.current = true;
        ignoreNextViewModeChange.current = false;
        ignoreNextGroupModeChange.current = false;
        lastCountryId.current = countryId;
      } catch (error) {
        // Ignore failures from a load that has already been superseded.
        if (myGeneration !== loadGeneration.current) return;
        console.error("Error loading filter options:", error);
        toast({
          title: "Error",
          description: "Failed to load filter options.",
          variant: "destructive",
        });
      } finally {
        // Only the current load controls the shared loading flag.
        if (myGeneration === loadGeneration.current) {
          setLoading(false);
        }
      }
    };

    loadFilterOptionsAndPreferences();
    // groupMode is NOT included in the dependency array because it would cause infinite loops
  }, [countryId, authUser, authLoading, onFilterChange, toast, onGroupModeChange, onPreferencesLoaded]); // groupMode removed from dependencies

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
    // If we're set to ignore the next change and still in initial load, skip this call
    if (ignoreNextViewModeChange.current && !initialLoadComplete.current) {
      ignoreNextViewModeChange.current = false;
      return;
    }
    
    // Clear the ignore flag if we're past initial load (user interaction)
    if (initialLoadComplete.current) {
      ignoreNextViewModeChange.current = false;
    }
    
    
    setViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    
    // Save view mode preference
    if (authUser && countryId) {
      
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
  }, [onViewModeChange, authUser, countryId, currentFilters, groupMode, sortOptions]);
  
  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    // If we're set to ignore the next change and still in initial load, skip this call
    if (ignoreNextGroupModeChange.current && !initialLoadComplete.current) {
      ignoreNextGroupModeChange.current = false;
      return;
    }
    
    // Clear the ignore flag if we're past initial load (user interaction)
    if (initialLoadComplete.current) {
      ignoreNextGroupModeChange.current = false;
    }
    
    
    // Save group mode preference if user is logged in
    if (authUser?.id) {
      
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
  }, [onGroupModeChange, authUser, countryId, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions]);

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
        countryId={countryId}
        countryName={countryName}
        countryNameAr={countryNameAr}
        countryNameTr={countryNameTr}
        profileUser={profileUser}
        onBackToCountries={onBackToCountries}
        collectionItems={collectionItems}
        sortedCollectionItems={sortedCollectionItems}
        sortedSaleItems={sortedSaleItems}
        sortedMissingItems={sortedMissingItems}
        sortedWishlistItems={sortedWishlistItems}
        currencies={currencies}
        categoryOrder={categoryOrder}
        getFlattenedItemsForExport={getFlattenedItemsForExport}
        preferencesLoaded={preferencesLoaded}
      />
    </div>
  );
}, areEqual);

// Add a display name for the memoized component
BanknoteFilterCollection.displayName = 'BanknoteFilterCollection';
