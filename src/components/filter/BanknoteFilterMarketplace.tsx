
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";


// Create marketplace preferences key constant to avoid typos
const MARKETPLACE_PREFERENCES_KEY = 'marketplace-filters';

interface BanknoteFilterMarketplaceProps {
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  availableCategories?: FilterOption[];
  availableTypes?: FilterOption[];
  availableCountries?: FilterOption[];
}

export const BanknoteFilterMarketplace: React.FC<BanknoteFilterMarketplaceProps> = ({
  onFilterChange,
  currentFilters,
  // isLoading = false,
  className,
  onViewModeChange,
  viewMode = 'grid',
  availableCategories: externalCategories,
  availableTypes: externalTypes,
  availableCountries: externalCountries,
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
  const [availableCountries, setAvailableCountries] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);


  useEffect(() => {
    // Always set sort options for the marketplace filter
    setSortOptions([
      {
        id: "country",
        name: tWithFallback('sort.country', 'Country'),
        fieldName: "country",
        isRequired: false
      },
      {
        id: "priceHighToLow",
        name: tWithFallback('sort.priceHighToLow', 'Price: High to Low'),
        fieldName: "priceHighToLow",
        isRequired: false
      },
      {
        id: "priceLowToHigh", 
        name: tWithFallback('sort.priceLowToHigh', 'Price: Low to High'),
        fieldName: "priceLowToHigh",
        isRequired: false
      },
      {
        id: "newest",
        name: tWithFallback('sort.newest', 'Newest Listed'),
        fieldName: "newest",
        isRequired: false
      },
      {
        id: "oldest",
        name: tWithFallback('sort.oldest', 'Oldest Listed'),
        fieldName: "oldest", 
        isRequired: false
      }
    ]);
  }, [tWithFallback]);
  
  // Helper function to ensure filters are never empty
  const ensureFiltersNotEmpty = useCallback((
    categories: string[],
    types: string[],
    availableCategories: FilterOption[],
    availableTypes: FilterOption[]
  ) => {
    // If categories is empty, select all available categories
    const finalCategories = categories.length === 0 
      ? availableCategories.map(cat => cat.id)
      : categories;
    
    // If types is empty, select all available types
    const finalTypes = types.length === 0 
      ? availableTypes.map(type => type.id)
      : types;
    
    return { finalCategories, finalTypes };
  }, []);

  // Use a memoized function to load user preferences to avoid re-renders
  const loadUserPreferences = useCallback(async (
    mappedCategories: FilterOption[], 
    mappedTypes: FilterOption[],
    mappedCountries: FilterOption[] = []
  ) => {
    try {
      if (user) {
        // Get user preferences from localStorage to avoid UUID issues
        const savedPreferencesStr = localStorage.getItem(`${MARKETPLACE_PREFERENCES_KEY}-${user.id}`);
        let userPreferences = null;
        
        if (savedPreferencesStr) {
          try {
            userPreferences = JSON.parse(savedPreferencesStr);
            console.log("Loaded marketplace preferences from localStorage:", userPreferences);
          } catch (err) {
            console.error("Error parsing saved preferences:", err);
          }
        }
        
        if (userPreferences) {
          // Ensure categories and types are never empty
          const { finalCategories, finalTypes } = ensureFiltersNotEmpty(
            userPreferences.categories || [],
            userPreferences.types || [],
            mappedCategories,
            mappedTypes
          );
          
          onFilterChange({
            search: userPreferences.search || "",
            categories: finalCategories,
            types: finalTypes,
            sort: userPreferences.sort || [],
            countries: userPreferences.countries || []
          });
        } else {
          // When no user preferences exist, select ALL filters by default to show all items
          console.log("No user preferences found, selecting ALL filters by default to show all items");
          
          onFilterChange({
            categories: mappedCategories.map(cat => cat.id),
            types: mappedTypes.map(type => type.id),
            sort: ["newest"],
            countries: []
          });
        }
      }
    } catch (err) {
      console.error("Error handling user preferences:", err);
      // Use all filters on error to show all items
      onFilterChange({
        categories: mappedCategories.map(cat => cat.id),
        types: mappedTypes.map(type => type.id),
        sort: ["newest"],
        countries: []
      });
    }
  }, [user, onFilterChange, ensureFiltersNotEmpty]);

  // Handle external category/type/country updates
  useEffect(() => {
    if (externalCategories && externalCategories.length > 0) {
      setCategories(externalCategories);
    }
    
    if (externalTypes && externalTypes.length > 0) {
      setTypes(externalTypes);
    }
    
    if (externalCountries && externalCountries.length > 0) {
      setAvailableCountries(externalCountries);
    }
    setIsLoading(false);
  }, [externalCategories, externalTypes, externalCountries]);

  // Load user preferences when external data is provided
  useEffect(() => {
    if (externalCategories && externalTypes && externalCountries && !initialLoadComplete) {
      const loadPreferencesWithExternalData = async () => {
        try {
          await loadUserPreferences(externalCategories, externalTypes, externalCountries || []);
          setInitialLoadComplete(true);
        } catch (error) {
          console.error("Error loading preferences with external data:", error);
        }
      };
      
      loadPreferencesWithExternalData();
    }
  }, [externalCategories, externalTypes, externalCountries, initialLoadComplete, loadUserPreferences]);

  // Load filter options once on component mount
  useEffect(() => {
    // Skip if already loaded
    if (initialLoadComplete) {
      return;
    }
    
    const loadFilterOptions = async () => {
      setIsLoading(true);
      
      try {
        // Get all categories and types
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('banknote_category_definitions')
          .select('*')
          .order('display_order');
          
        if (categoriesError) throw categoriesError;

        const { data: typesData, error: typesError } = await supabase
          .from('banknote_type_definitions')
          .select('*')
          .order('display_order');
          
        if (typesError) throw typesError;
        
        // Get all countries
        const { data: countriesData, error: countriesError } = await supabase
          .from('countries')
          .select('*')
          .order('name');
          
        if (countriesError) throw countriesError;
        
        // Map the data to FilterOption format
        const mappedCategories = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
        }));
        
        const mappedTypes = typesData.map(type => ({
          id: type.id,
          name: type.name,
        }));
        
        const mappedCountries = countriesData.map(country => ({
          id: country.id,
          name: country.name,
        }));
        
                 // Create fixed sort options for marketplace
         const sortOptions = [
           {
             id: "country",
             name: tWithFallback('sort.country', 'Country'),
             fieldName: "country",
             isRequired: false
           },
           {
             id: "priceHighToLow",
             name: tWithFallback('sort.priceHighToLow', 'Price: High to Low'),
             fieldName: "priceHighToLow",
             isRequired: false
           },
           {
             id: "priceLowToHigh", 
             name: tWithFallback('sort.priceLowToHigh', 'Price: Low to High'),
             fieldName: "priceLowToHigh",
             isRequired: false
           },
           {
             id: "newest",
             name: tWithFallback('sort.newest', 'Newest Listed'),
             fieldName: "newest",
             isRequired: false
           },
           {
             id: "oldest",
             name: tWithFallback('sort.oldest', 'Oldest Listed'),
             fieldName: "oldest", 
             isRequired: false
           }
         ];
        
        setCategories(mappedCategories);
        setTypes(mappedTypes);
        setSortOptions(sortOptions);
        
        // Load user preferences
        await loadUserPreferences(mappedCategories, mappedTypes, []);
        
        // Mark initial load as complete
        setInitialLoadComplete(true);
        
      } catch (error) {
        console.error("Error loading filter options:", error);
        toast({
          title: tWithFallback('errors.failedToLoadPreferences', 'Error'),
          description: tWithFallback('errors.failedToLoadPreferences', 'Failed to load filter options.'),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterOptions();
  }, [loadUserPreferences, toast, initialLoadComplete, externalCategories, externalTypes]);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    // For marketplace, don't force extPick - let users sort by price/date without catalog number interference
    
    // Get the current filter values
    const currentCategories = newFilters.categories || currentFilters.categories || [];
    const currentTypes = newFilters.types || currentFilters.types || [];
    
    // Ensure categories and types are never empty
    const { finalCategories, finalTypes } = ensureFiltersNotEmpty(
      currentCategories,
      currentTypes,
      categories,
      types
    );
    
    // Create the final filter object with ensured non-empty arrays
    const finalFilters = {
      ...newFilters,
      categories: finalCategories,
      types: finalTypes
    };
    
    // Save user preferences to localStorage instead of database
    if (user?.id) {
      console.log("Auto-saving marketplace filter preferences to localStorage");
      localStorage.setItem(
        `${MARKETPLACE_PREFERENCES_KEY}-${user.id}`, 
        JSON.stringify({
          search: finalFilters.search || currentFilters.search,
          categories: finalFilters.categories,
          types: finalFilters.types,
          sort: finalFilters.sort || currentFilters.sort,
          countries: finalFilters.countries || currentFilters.countries
        })
      );
    }
    
    onFilterChange(finalFilters);
  }, [onFilterChange, currentFilters, user, ensureFiltersNotEmpty, categories, types]);



  


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
        isLoading={isLoading}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        countries={externalCountries || availableCountries}
      />
    </div>
  );
};
