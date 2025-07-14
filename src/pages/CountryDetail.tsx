import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { cn } from "@/lib/utils";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { BanknoteDisplay } from "@/components/country/BanknoteDisplay";
import { useCountryData } from "@/hooks/use-country-data";
import { useBanknoteFetching } from "@/hooks/use-banknote-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { useEffect } from "react";
import { CollectionItem, fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });

  // New: user + collection loading
  const { user } = useAuth();
  const [userCollection, setUserCollection] = useState<CollectionItem[]>([]);

  useEffect(() => {
    const fetchCollection = async () => {
      if (!user) {
        setUserCollection([]);
        console.log("[CountryDetail] No user, empty userCollection");
        return;
      }
      try {
        const collection = await fetchUserCollection(user.id);
        setUserCollection(collection);
        console.log(`[CountryDetail] Loaded userCollection for user ${user.id}, count: ${collection.length}`);
      } catch (e) {
        setUserCollection([]);
        console.log("[CountryDetail] Failed to fetch userCollection", e);
      }
    }
    fetchCollection();
  }, [user]);

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

  const { banknotes, loading: banknotesLoading } = useBanknoteFetching({
    countryId,
    filters
  });

  const sortedBanknotes = useBanknoteSorting({
    banknotes,
    currencies,
    sortFields: filters.sort
  });

  const groupedItems = useBanknoteGroups(
    sortedBanknotes, 
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

  const isLoading = countryLoading || banknotesLoading;

  // Log right before rendering BanknoteDisplay
  console.log("[CountryDetail] groupMode:", groupMode, "userCollection length:", userCollection.length);

  return (
    <div className="w-full px-2 sm:px-6 py-8 -mb-10">


      <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <CountryFilterSection
          countryId={countryId}
          countryName={country ? decodeURIComponent(country) : ""}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
        />

        <BanknoteDisplay
          groups={groupedItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          userCollection={userCollection}
        />
      </div>
    </div>
  );
};

export default CountryDetail;
