
import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { useCountryData } from "@/hooks/use-country-data";
import { useCollectionItemsFetching } from "@/hooks/use-collection-items-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { useAuth } from "@/context/AuthContext";
import { CollectionItemsDisplay } from "@/components/country/CollectionItemsDisplay";

interface CountryDetailCollectionProps {
  userId?: string;  // Optional user ID prop for viewing other users' collections
  countryName?: string; // Optional country name prop when not using URL params
}

const CountryDetailCollection: React.FC<CountryDetailCollectionProps> = ({ userId, countryName }) => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  
  // Use either the prop or the URL param for country name
  const effectiveCountryName = countryName || (country ? decodeURIComponent(country) : "");
  
  // Determine if current user is owner of the collection
  const isOwner = !userId || (user && userId === user.id);
  const effectiveUserId = userId || user?.id;
  
  console.log("CountryDetailCollection - isOwner:", isOwner, "userId:", userId, "currentUser:", user?.id);
  
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
    handleGroupModeChange
  } = useCountryData({ 
    countryName: effectiveCountryName, 
    navigate 
  });

  // Use the collection items fetching hook with skipInitialFetch option
  const { collectionItems, loading: collectionItemsLoading } = useCollectionItemsFetching({
    countryId,
    filters,
    userId: effectiveUserId,
    skipInitialFetch: !preferencesLoaded
  });

  // Map collection items to a format compatible with the sorting hook
  const collectionItemsForSorting = collectionItems.map(item => ({
    ...item.banknote,
    collectionData: {
      id: item.id,
      condition: item.condition,
      purchaseDate: item.purchaseDate,
      isForSale: item.isForSale,
      salePrice: item.salePrice
    },
    // Add a reference to the original collection item ID
    collectionItemId: item.id
  }));

  const sortedCollectionItems = useBanknoteSorting({
    banknotes: collectionItemsForSorting,
    currencies,
    sortFields: filters.sort
  });

  // Transform the sorted detailed banknotes back to collection items using the stored collectionItemId
  const sortedCollectionItemsWithData = sortedCollectionItems.map(sortedBanknote => {
    // Use the direct reference to the collection item ID
    const originalItem = collectionItems.find(item => item.id === (sortedBanknote as any).collectionItemId);
    if (!originalItem) {
      console.error("Could not find original collection item for ID:", (sortedBanknote as any).collectionItemId);
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
    // Map each banknote in the group to its corresponding collection item using collectionItemId
    const collectionItemsInGroup = group.items.map(banknote => {
      const collectionItem = collectionItems.find(item => item.id === (banknote as any).collectionItemId);
      if (!collectionItem) {
        console.error("Could not find collection item for banknote with collectionItemId:", (banknote as any).collectionItemId);
      }
      return collectionItem;
    }).filter(Boolean) as any[];
    
    // Process sultan groups if they exist, also using collectionItemId
    const sultanGroups = group.sultanGroups?.map(sultanGroup => ({
      sultan: sultanGroup.sultan,
      items: sultanGroup.items.map(banknote => {
        const collectionItem = collectionItems.find(item => item.id === (banknote as any).collectionItemId);
        if (!collectionItem) {
          console.error("Could not find collection item for banknote with collectionItemId in sultan group:", (banknote as any).collectionItemId);
        }
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
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    // Mark preferences as loaded when filter changes come from BanknoteFilterCollection
    setPreferencesLoaded(true);
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const isLoading = countryLoading || collectionItemsLoading;

  const handlePreferencesLoaded = useCallback(() => {
    setPreferencesLoaded(true);
  }, []);

  // Determine the return path - if we're in profile view, it should return to profile
  const returnPath = userId ? `/profile/${user?.username}` : '/collection';

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      <CountryHeader 
        countryName={effectiveCountryName} 
        returnPath={returnPath} 
      />

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
          onPreferencesLoaded={handlePreferencesLoaded}
        />

        <CollectionItemsDisplay
          groups={groupedCollectionItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
};

export default CountryDetailCollection;
