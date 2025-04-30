
import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { cn } from "@/lib/utils";
import { useCollectionCountryData } from "@/hooks/use-collection-country-data";
import { BanknoteFilterCollection } from "@/components/filter/BanknoteFilterCollection";
import { CollectionCountryHeader } from "@/components/collection/CollectionCountryHeader";
import { CollectionDisplay } from "@/components/collection/CollectionDisplay";
import { useEffect } from "react";

const CountryDetailCollection = () => {
  const { userId, country } = useParams();
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
      sessionStorage.setItem('collectionScrollY', window.scrollY.toString());
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const {
    countryId,
    collectionItems,
    categories,
    types,
    loading,
    groupMode,
    handleGroupModeChange
  } = useCollectionCountryData({ 
    userId, 
    countryName: country || "", 
    navigate 
  });

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      <CollectionCountryHeader 
        countryName={country ? decodeURIComponent(country) : ""} 
        userId={userId}
      />

      <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <BanknoteFilterCollection
          countryId={countryId}
          onFilterChange={handleFilterChange}
          currentFilters={filters}
          isLoading={loading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
          collectionCategories={categories}
          collectionTypes={types}
        />

        <CollectionDisplay
          items={collectionItems}
          viewMode={viewMode}
          groupMode={groupMode}
          isLoading={loading}
          isPublic={!!userId}
          filters={filters}
        />
      </div>
    </div>
  );
};

export default CountryDetailCollection;
