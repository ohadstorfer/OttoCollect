
import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  userId?: string; // Added to support viewing collections of other users
  isOwner?: boolean; // Added to identify if user owns the collection
}

const CountryDetailCollection: React.FC<CountryDetailCollectionProps> = ({ 
  userId: propsUserId,
  isOwner: propsIsOwner
}) => {
  const { country } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  
  // Get userId from props, URL params, or current user
  const urlParams = new URLSearchParams(location.search);
  const urlUserId = urlParams.get('userId');
  
  // Determine the userId - prioritize props, then URL params, then logged-in user
  const userId = propsUserId || urlUserId || user?.id;
  
  // Determine if current user is the owner of this collection
  const isOwner = propsIsOwner !== undefined ? propsIsOwner : (!propsUserId && !urlUserId) || (user && userId === user.id);
  
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
    countryName: country || "", 
    navigate 
  });

  // Use the collection items fetching hook with skipInitialFetch option
  const { collectionItems, loading: collectionItemsLoading } = useCollectionItemsFetching({
    countryId,
    filters,
    userId: userId,
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

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      {!propsUserId && (
        <CountryHeader 
          countryName={country ? decodeURIComponent(country) : ""} 
          returnPath="/collection" 
        />
      )}

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
