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
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['filter']);

  // Per-country key for the filter snapshot in sessionStorage. The cached
  // payload also stores the owner's user id; on restore we discard a snapshot
  // that belongs to a different account (or to a logged-in user when viewing
  // anonymously), which is how one account's saved view is kept from leaking
  // to another sharing the same browser session.
  const filtersCacheKey = `catalog-filters-${countryName}`;
  const currentUserId = user?.id ?? null;
  
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
  
  // Default the images-only toggle ON; the real value is hydrated during the
  // load effect below (DB row for logged users, localStorage for anonymous).
  const [imagesOnly, setImagesOnlyState] = useState<boolean>(true);

  // Add refs to track states and prevent render loops
  const initialLoadComplete = useRef(false);
  const ignoreNextGroupModeChange = useRef(false);
  const ignoreNextViewModeChange = useRef(false);
  const lastCountryId = useRef("");
  const lastUserState = useRef<string | null>(null); // Track user state changes
  // Monotonic token identifying the latest load. An in-flight load whose token
  // is no longer current discards its results, so a newer (country, user) load
  // always wins instead of an older one silently dropping or overwriting it.
  const loadGeneration = useRef(0);

  useEffect(() => {
    if (!countryId) return;
    // Wait until auth has resolved. Running while `user` is still null (auth is
    // async on a hard refresh) would prematurely apply the anonymous defaults
    // and then have to re-run once the real user arrives, causing a flash and
    // the lost-preferences symptom.
    if (authLoading) return;
    const currentUserState = user?.id || null;

    // Reset the completion flag whenever the (country, user) key changes so a
    // fresh load runs for the new key.
    if (lastUserState.current !== currentUserState || lastCountryId.current !== countryId) {
      initialLoadComplete.current = false;
    }

    // Already fully loaded for this exact (country, user): nothing to do.
    if (lastCountryId.current === countryId &&
        lastUserState.current === currentUserState &&
        initialLoadComplete.current) {
      return;
    }

    // Claim this run. Any previous in-flight load is now stale and will discard
    // its results via the generation checks below. This replaces the old
    // `isFetchingFilter` early-return, which could DROP a load entirely - e.g.
    // when `user` resolved while an anonymous load was still in flight, the
    // user's real preferences were never fetched.
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

        // Always ensure extPick is included in the sort options for fallback sorting
        const requiredSortFields = sortOptionsData
          .filter(opt => opt.is_required)
          .map(opt => opt.field_name || '');

        if (!requiredSortFields.includes('extPick')) {
          requiredSortFields.push('extPick');
        }

        // Valid ID sets for validation
        const validCategoryIds = new Set(mappedCategories.map(c => c.id));
        const validTypeIds = new Set(mappedTypes.map(t => t.id));
        const validSortFieldNames = new Set(mappedSortOptions.map(s => s.fieldName).filter(Boolean));

        // Try to restore from sessionStorage first (fast cache for both auth and unauth users)
        let restoredFromCache = false;
        if (!initialLoadComplete.current) {
          try {
            const cached = sessionStorage.getItem(filtersCacheKey);
            if (cached) {
              const parsed = JSON.parse(cached) as {
                categories?: string[];
                types?: string[];
                sort?: string[];
                search?: string;
                viewMode?: 'grid' | 'list';
                groupMode?: boolean;
                imagesOnly?: boolean;
                userId?: string | null;
              };

              // Owner of the cached snapshot. Discard it if it belongs to a
              // different account, or to a logged-in user while viewing
              // anonymously, so one account never restores another's view.
              const cacheOwner = parsed.userId ?? null;

              // Validate cached IDs against current definitions
              const cachedCategories = (parsed.categories || []).filter(id => validCategoryIds.has(id));
              const cachedTypes = (parsed.types || []).filter(id => validTypeIds.has(id));
              const cachedSort = (parsed.sort || []).filter(f => validSortFieldNames.has(f));

              // Only use cache if it belongs to the current user and has valid
              // categories and types.
              if (cacheOwner === currentUserId && cachedCategories.length > 0 && cachedTypes.length > 0) {
                // Ensure required sort fields are included
                const finalSortFields = Array.from(
                  new Set([...cachedSort, ...requiredSortFields])
                );

                const cachedImagesOnly = typeof parsed.imagesOnly === 'boolean' ? parsed.imagesOnly : true;
                setImagesOnlyState(cachedImagesOnly);

                onFilterChange({
                  categories: cachedCategories,
                  types: cachedTypes,
                  sort: finalSortFields,
                  search: parsed.search || '',
                  imagesOnly: cachedImagesOnly,
                });

                // Restore viewMode
                if (parsed.viewMode && onViewModeChange) {
                  ignoreNextViewModeChange.current = true;
                  setViewMode(parsed.viewMode);
                  onViewModeChange(parsed.viewMode);
                }

                // Restore groupMode
                if (typeof parsed.groupMode === 'boolean' && onGroupModeChange && parsed.groupMode !== groupMode) {
                  ignoreNextGroupModeChange.current = true;
                  onGroupModeChange(parsed.groupMode);
                }

                restoredFromCache = true;
              }
            }
          } catch (err) {
            console.error("Error restoring filters from sessionStorage:", err);
          }
        }

        // If not restored from cache, fall back to DB preferences or defaults
        if (!restoredFromCache) {
          let userPreferences = null;
          let anonDefaults: Awaited<ReturnType<typeof fetchCountryDefaultPreferences>> = null;
          // Admin-configured defaults for brand-new users. Used as the fallback
          // for a logged-in user who has NO saved preferences row yet (instead
          // of the hardcoded "all"). Never overrides an existing row.
          let newUserDefaults: Awaited<ReturnType<typeof fetchCountryDefaultPreferences>> = null;
          // Resolve the images-only preference per auth state. Default ON
          // for new users (no row) and anonymous users (no localStorage entry).
          let resolvedImagesOnly = true;
          if (user) {
            try {
              userPreferences = await fetchUserFilterPreferences(user.id, countryId);
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

              // images-only: user row wins, else admin new_user default, else ON.
              if (userPreferences && typeof userPreferences.images_only === 'boolean') {
                resolvedImagesOnly = userPreferences.images_only;
              } else if (newUserDefaults && typeof newUserDefaults.images_only === 'boolean') {
                resolvedImagesOnly = newUserDefaults.images_only;
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
                // Set a flag to ignore the next view mode change to prevent infinite loops
                ignoreNextViewModeChange.current = true;
                setViewMode(resolvedViewMode);
                onViewModeChange(resolvedViewMode);
              }
            } catch (err) {
              console.error("Error fetching user preferences:", err);
            }
          } else {
            // Anonymous users: read images-only from localStorage if present.
            let imagesOnlyOverridden = false;
            try {
              const stored = localStorage.getItem('imagesOnly');
              if (stored === 'false') {
                resolvedImagesOnly = false;
                imagesOnlyOverridden = true;
              } else if (stored === 'true') {
                resolvedImagesOnly = true;
                imagesOnlyOverridden = true;
              }
            } catch {
              // localStorage may be disabled
            }

            // Pull country-level anonymous defaults set by admin (if any).
            try {
              anonDefaults = await fetchCountryDefaultPreferences(countryId, 'anonymous');
            } catch (err) {
              console.error("Error loading country anonymous defaults:", err);
            }
            // Abandon if a newer (country, user) load superseded us mid-fetch.
            if (myGeneration !== loadGeneration.current) return;
            if (anonDefaults && !imagesOnlyOverridden && typeof anonDefaults.images_only === 'boolean') {
              resolvedImagesOnly = anonDefaults.images_only;
            }

            // viewMode: sessionStorage takes priority, otherwise admin default
            let viewModeApplied = false;
            try {
              const savedViewMode = sessionStorage.getItem(`viewMode-${countryId}`);
              if (savedViewMode && onViewModeChange && !initialLoadComplete.current) {
                const parsedViewMode = JSON.parse(savedViewMode) as 'grid' | 'list';
                ignoreNextViewModeChange.current = true;
                setViewMode(parsedViewMode);
                onViewModeChange(parsedViewMode);
                viewModeApplied = true;
              }
            } catch (err) {
              console.error("Error loading view mode from session storage:", err);
            }
            if (!viewModeApplied && anonDefaults?.view_mode && onViewModeChange && !initialLoadComplete.current) {
              ignoreNextViewModeChange.current = true;
              setViewMode(anonDefaults.view_mode);
              onViewModeChange(anonDefaults.view_mode);
            }
          }

          setImagesOnlyState(resolvedImagesOnly);

          if (userPreferences && !initialLoadComplete.current) {
            // Validate saved IDs against the country's CURRENT definitions.
            // If the admin edited/recreated categories or types their UUIDs
            // change, leaving the user's saved IDs orphaned -> the query would
            // filter down to nothing and the catalog would render empty.
            // Fall back to "all" when the saved selection no longer matches.
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

            const finalSortFields = Array.from(
              new Set([...sortFieldNames, ...requiredSortFields])
            );

            onFilterChange({
              categories: resolvedCategories,
              types: resolvedTypes,
              sort: finalSortFields,
              imagesOnly: resolvedImagesOnly,
            });
          } else if (!initialLoadComplete.current && !user) {
            // Anonymous user with no cache: apply admin-configured anonymous
            // defaults if set, otherwise fall back to "all selected".
            let defaultCategoryIds = mappedCategories.map(cat => cat.id);
            let defaultTypeIds = mappedTypes.map(t => t.id);
            let defaultSort: string[] = ['extPick'];

            if (anonDefaults) {
              if (Array.isArray(anonDefaults.selected_categories) && anonDefaults.selected_categories.length > 0) {
                const valid = new Set(mappedCategories.map(c => c.id));
                const filtered = anonDefaults.selected_categories.filter(id => valid.has(id));
                if (filtered.length > 0) defaultCategoryIds = filtered;
              }
              if (Array.isArray(anonDefaults.selected_types) && anonDefaults.selected_types.length > 0) {
                const valid = new Set(mappedTypes.map(t => t.id));
                const filtered = anonDefaults.selected_types.filter(id => valid.has(id));
                if (filtered.length > 0) defaultTypeIds = filtered;
              }
              if (Array.isArray(anonDefaults.selected_sort_options) && anonDefaults.selected_sort_options.length > 0) {
                const fieldNames = anonDefaults.selected_sort_options
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
              imagesOnly: resolvedImagesOnly,
            });
          } else if (!initialLoadComplete.current && user && !userPreferences) {
            // Logged-in user with no saved row: apply the admin-configured
            // 'new_user' defaults if set, otherwise fall back to "all selected".
            let defaultCategoryIds = mappedCategories.map(cat => cat.id);
            let defaultTypeIds = mappedTypes.map(t => t.id);
            let defaultSort: string[] = ['extPick'];

            if (newUserDefaults) {
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
              imagesOnly: resolvedImagesOnly,
            });
          }
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
        // Ignore failures from a load that has already been superseded.
        if (myGeneration !== loadGeneration.current) return;
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
        // Only the current load controls the shared loading flag.
        if (myGeneration === loadGeneration.current) {
          setLoading(false);
        }
      }
    };

    loadFilterOptionsAndPreferences();
    // groupMode is NOT included in the dependency array because it would cause infinite loops
  }, [countryId, user, authLoading, onFilterChange, toast, onGroupModeChange]); // Removed onPreferencesLoaded from dependencies to prevent re-runs

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

    // Save to sessionStorage as fast cache for navigation restoration
    try {
      const mergedImagesOnly = typeof newFilters.imagesOnly === 'boolean'
        ? newFilters.imagesOnly
        : (typeof currentFilters.imagesOnly === 'boolean' ? currentFilters.imagesOnly : imagesOnly);
      const mergedFilters = {
        categories: newFilters.categories || currentFilters.categories || [],
        types: newFilters.types || currentFilters.types || [],
        sort: newFilters.sort || currentFilters.sort || [],
        search: newFilters.search !== undefined ? newFilters.search : currentFilters.search || '',
        viewMode,
        groupMode,
        imagesOnly: mergedImagesOnly,
        userId: currentUserId,
      };
      sessionStorage.setItem(filtersCacheKey, JSON.stringify(mergedFilters));
    } catch (e) {
      // sessionStorage may be full or unavailable
    }
  }, [onFilterChange, sortOptions, user, countryId, countryName, currentFilters, groupMode, viewMode, imagesOnly]);

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
    
    // Always save to sessionStorage as fast cache (regardless of auth status)
    try {
      sessionStorage.setItem(`viewMode-${countryId}`, JSON.stringify(mode));
      // Also update the full filter cache
      const cached = sessionStorage.getItem(filtersCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.viewMode = mode;
        sessionStorage.setItem(filtersCacheKey, JSON.stringify(parsed));
      }
    } catch (e) {
      // sessionStorage may be full or unavailable
    }

    // Save view mode preference to DB for authenticated users
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
    
    // Always save to sessionStorage as fast cache (regardless of auth status)
    try {
      sessionStorage.setItem(`groupMode-${countryId}`, JSON.stringify(mode));
      // Also update the full filter cache
      const cached = sessionStorage.getItem(filtersCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.groupMode = mode;
        sessionStorage.setItem(filtersCacheKey, JSON.stringify(parsed));
      }
    } catch (e) {
      // sessionStorage may be full or unavailable
    }

    // Save group mode preference to DB for authenticated users
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
    }
    
    if (onGroupModeChange) {
      console.log("BanknoteFilterCatalog: Calling parent onGroupModeChange with mode:", mode);
      onGroupModeChange(mode);
    }
  }, [onGroupModeChange, user, countryId, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions]);

  const handleImagesOnlyChange = React.useCallback((value: boolean) => {
    setImagesOnlyState(value);
    onFilterChange({ imagesOnly: value });

    // Persist: per-user/per-country for logged users, global localStorage for guests.
    if (user?.id) {
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
        view_mode: viewMode,
        images_only: value,
      }).catch(err => {
        console.error("Error saving images-only preference:", err);
      });
    } else {
      try {
        localStorage.setItem('imagesOnly', String(value));
      } catch {
        // localStorage may be disabled
      }
    }

    // Update the navigation cache so a page revisit keeps the choice.
    try {
      const cached = sessionStorage.getItem(filtersCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.imagesOnly = value;
        sessionStorage.setItem(filtersCacheKey, JSON.stringify(parsed));
      }
    } catch {
      // sessionStorage may be unavailable
    }
  }, [onFilterChange, user, countryId, countryName, currentFilters.categories, currentFilters.sort, currentFilters.types, sortOptions, groupMode, viewMode]);

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
        imagesOnly={imagesOnly}
        onImagesOnlyChange={handleImagesOnlyChange}
        countryName={countryName}
        countryNameAr={countryNameAr}
        countryNameTr={countryNameTr}
      />
    </div>
  );
}, areEqual);

// Add a display name for the memoized component
BanknoteFilterCatalog.displayName = 'BanknoteFilterCatalog';
