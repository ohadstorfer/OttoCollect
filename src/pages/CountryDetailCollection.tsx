
import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { useCountryData } from "@/hooks/use-country-data";
import { useCollectionItemsFetching } from "@/hooks/use-collection-items-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { CollectionItemsDisplay } from "@/components/country/CollectionItemsDisplay";
import { fetchUserFilterPreferences } from "@/services/countryService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CountryDetailCollection = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  
  // Track if user preferences have been loaded
  const [preferencesLoaded, setPreferencesLoaded] = useState<boolean>(false);
  
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollY', window.scrollY.toString());
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const {
    countryId,
    categoryOrder,
    currencies,
    loading: countryLoading,
    groupMode,
    handleGroupModeChange,
    hasLoadedPreferences
  } = useCountryData({ 
    countryName: country || "", 
    navigate 
  });

  // Load user filter preferences when countryId is available
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!countryId || preferencesLoaded) return;

      console.log("CountryDetailCollection: Loading user filter preferences");
      
      try {
        if (user?.id) {
          // For logged in users, fetch preferences from database
          const preferences = await fetchUserFilterPreferences(user.id, countryId);
          
          if (preferences) {
            console.log("CountryDetailCollection: User preferences loaded", preferences);
            
            // Apply loaded preferences to filters state
            setFilters(prev => ({
              ...prev,
              categories: preferences.selected_categories || [],
              types: preferences.selected_types || [],
              sort: preferences.selected_sort_options || ["extPick"]
            }));
          }
        } else {
          // For non-logged in users, try to load from session storage
          try {
            const savedFilters = sessionStorage.getItem(`filters-${countryId}`);
            if (savedFilters) {
              const parsedFilters = JSON.parse(savedFilters);
              console.log("CountryDetailCollection: Loaded filters from session storage:", parsedFilters);
              setFilters(parsedFilters);
            }
          } catch (err) {
            console.error("Error loading filters from session storage:", err);
          }
        }
        
      } catch (error) {
        console.error("Error loading user filter preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load your filter preferences. Using default filters.",
          variant: "destructive",
        });
      } finally {
        // Mark preferences as loaded even if there was an error
        setPreferencesLoaded(true);
      }
    };
    
    loadUserPreferences();
  }, [countryId, user, toast, preferencesLoaded]);

  // Use the collection items fetching hook with the skipInitialFetch option
  const { collectionItems, loading: collectionItemsLoading, fetchCollectionItems } = useCollectionItemsFetching({
    countryId,
    filters,
    skipInitialFetch: !preferencesLoaded // Skip the fetch until preferences are loaded
  });

  // Trigger the fetch when preferences are loaded
  useEffect(() => {
    if (preferencesLoaded && countryId && fetchCollectionItems) {
      console.log("CountryDetailCollection: Preferences loaded, triggering fetch with filters:", filters);
      fetchCollectionItems();
    }
  }, [preferencesLoaded, countryId, filters, fetchCollectionItems]);

  // Map collection items to a format compatible with the sorting hook
  const collectionItemsForSorting = collectionItems.map(item => ({
    ...item.banknote,
    collectionData: {
      id: item.id,
      condition: item.condition,
      purchaseDate: item.purchaseDate,
      isForSale: item.isForSale,
      salePrice: item.salePrice
    }
  }));

  const sortedCollectionItems = useBanknoteSorting({
    banknotes: collectionItemsForSorting,
    currencies,
    sortFields: filters.sort
  });

  // Transform the sorted detailed banknotes back to collection items
  const sortedCollectionItemsWithData = sortedCollectionItems.map(sortedBanknote => {
    // Find the original collection item for this banknote
    const originalItem = collectionItems.find(item => item.banknoteId === sortedBanknote.id);
    if (!originalItem) {
      console.error("Could not find original collection item for banknote ID:", sortedBanknote.id);
      return null;
    }
    return originalItem;
  }).filter(Boolean) as any[]; // Filter out any null values

  const groupedItems = useBanknoteGroups(
    sortedCollectionItems, 
    filters.sort, 
    categoryOrder
  );

  // Convert grouped banknotes to grouped collection items
  const groupedCollectionItems = groupedItems.map(group => {
    // Map each banknote in the group to its corresponding collection item
    const collectionItemsInGroup = group.items.map(banknote => {
      const collectionItem = collectionItems.find(item => item.banknoteId === banknote.id);
      return collectionItem;
    }).filter(Boolean) as any[];
    
    // Process sultan groups if they exist
    const sultanGroups = group.sultanGroups?.map(sultanGroup => ({
      sultan: sultanGroup.sultan,
      items: sultanGroup.items.map(banknote => {
        const collectionItem = collectionItems.find(item => item.banknoteId === banknote.id);
        return collectionItem;
      }).filter(Boolean) as any[]
    }));

    return {
      category: group.category,
      items: collectionItemsInGroup,
      sultanGroups: sultanGroups
    };
  });

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    console.log("CountryDetailCollection: Filter changed", newFilters);
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const isLoading = countryLoading || collectionItemsLoading || !preferencesLoaded;

  // Debug log for the complete rendering cycle
  console.log("CountryDetailCollection: Rendering with", {
    countryId,
    preferencesLoaded,
    filters,
    isLoading,
    collectionItemsCount: collectionItems.length,
    sortedItemsCount: sortedCollectionItemsWithData.length,
    groupedItemsCount: groupedCollectionItems.length,
  });

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      <CountryHeader countryName={country ? decodeURIComponent(country) : ""} />

      <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <CountryFilterSection
          countryId={countryId}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
          source="collection"
        />

        <CollectionItemsDisplay
          groups={groupedCollectionItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
        />
      </div>
    </div>
  );
};

export default CountryDetailCollection;
