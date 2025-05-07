
import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { useCountryData } from "@/hooks/use-country-data";
import { useCollectionItemsFetching } from "@/hooks/use-collection-items-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { useEffect } from "react";
import { CollectionItemsDisplay } from "@/components/country/CollectionItemsDisplay";

const CountryDetailCollection = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  
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

  // Use the collection items fetching hook
  const { collectionItems, loading: collectionItemsLoading } = useCollectionItemsFetching({
    countryId,
    filters
  });

  // Add logging for debugging
  useEffect(() => {
    console.log("CountryDetailCollection: Current filters:", filters);
    console.log("CountryDetailCollection: Fetched collection items:", collectionItems.length);
    
    if (collectionItems.length > 0) {
      console.log("CountryDetailCollection: Sample item categories/types:", 
        collectionItems.map(item => ({
          id: item.id,
          category: item.banknote?.category,
          type: item.banknote?.type
        }))
      );
    }
  }, [filters, collectionItems]);

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
    console.log("CountryDetailCollection: Filter change:", newFilters);
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const isLoading = countryLoading || collectionItemsLoading;

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
