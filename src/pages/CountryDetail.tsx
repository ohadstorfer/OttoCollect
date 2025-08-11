import React, { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { cn } from "@/lib/utils";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { BanknoteDisplay } from "@/components/country/BanknoteDisplay";
import { useCountryData } from "@/hooks/use-country-data";
import { useBanknoteFetching } from "@/hooks/use-banknote-fetching";
import { useOptimizedBanknoteSorting } from "@/hooks/use-optimized-banknote-sorting";
import { useOptimizedBanknoteGroups } from "@/hooks/use-optimized-banknote-groups";
import { getSultanOrderMap } from "@/services/sultanOrderService";
import { CollectionItem, fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: [],
  });

  // New: user + collection loading
  const { user } = useAuth();
  const [userCollection, setUserCollection] = useState<CollectionItem[]>([]);
  
  // Add preferences loading state
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [sultanOrderMap, setSultanOrderMap] = useState<Map<string, number>>(new Map());

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

  // Fetch sultan order map when country changes
  useEffect(() => {
    if (countryId) {
      console.log(`\n🌍 [CountryDetail Debug] Fetching sultan order map for country ID: ${countryId}`);
      getSultanOrderMap(countryId)
        .then(map => {
          console.log(`✅ [CountryDetail Debug] Successfully fetched sultan order map:`, 
            Array.from(map.entries()).map(([name, order]) => `"${name}": ${order}`));
          setSultanOrderMap(map);
        })
        .catch(error => {
          console.error(`❌ [CountryDetail Debug] Failed to fetch sultan order map:`, error);
          setSultanOrderMap(new Map());
        });
    }
  }, [countryId]);

  const { banknotes, loading: banknotesLoading } = useBanknoteFetching({
    countryId,
    filters
  });

  const sortedBanknotes = useOptimizedBanknoteSorting({
    banknotes,
    currencies,
    sortFields: filters.sort
  });

  // Debug: Log all unique sultan names in banknotes
  useEffect(() => {
    if (banknotes.length > 0) {
      const uniqueSultans = new Set(banknotes.map(b => b.sultanName).filter(Boolean));
      console.log(`\n📊 [CountryDetail Debug] Unique sultan names found in banknotes:`, 
        Array.from(uniqueSultans));
    }
  }, [banknotes]);

  // Debug: Log categoryOrder before passing to grouping hook
  useEffect(() => {
    if (categoryOrder && categoryOrder.length > 0) {
      console.log(`\n🌍 [CountryDetail Debug] Category order data:`, categoryOrder);
      console.log(`  Category order length:`, categoryOrder.length);
      console.log(`  Category order structure:`, JSON.stringify(categoryOrder, null, 2));
    } else {
      console.log(`\n🌍 [CountryDetail Debug] Category order is empty or undefined:`, categoryOrder);
    }
  }, [categoryOrder]);

  const groupedItems = useOptimizedBanknoteGroups({
    banknotes: sortedBanknotes,
    sortFields: filters.sort,
    categoryOrder,
    countryId,
    sultanOrderMap
  });

  // Extract banknote IDs for wishlist context
  const banknoteIds = banknotes.map(banknote => banknote.id);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  // Handle preferences loaded callback
  const handlePreferencesLoaded = useCallback(() => {
    setPreferencesLoaded(true);
  }, []);

  // Calculate loading state - include preferences loading
  const isLoading = countryLoading || banknotesLoading || !preferencesLoaded;

  return (
    <WishlistProvider banknoteIds={banknoteIds}>
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
            onPreferencesLoaded={handlePreferencesLoaded}
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
    </WishlistProvider>
  );
};

export default CountryDetail;
