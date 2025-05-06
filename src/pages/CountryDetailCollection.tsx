
import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { BanknoteDisplay } from "@/components/country/BanknoteDisplay";
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

  // Use the new collection items fetching hook
  const { collectionItems, loading: collectionItemsLoading } = useCollectionItemsFetching({
    countryId,
    filters
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
    }
  }));

  const sortedCollectionItems = useBanknoteSorting({
    banknotes: collectionItemsForSorting,
    currencies,
    sortFields: filters.sort
  });

  const groupedItems = useBanknoteGroups(
    sortedCollectionItems, 
    filters.sort, 
    categoryOrder
  );

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
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
          groups={groupedItems}
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
