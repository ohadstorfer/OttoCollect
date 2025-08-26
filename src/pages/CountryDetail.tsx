import React, { useState, useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
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
  
  // Track scroll restoration state
  const scrollRestorationState = useRef({
    attempted: false,
    lastCountryId: '',
    lastScrollY: 0
  });

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
      } catch (e) {
        setUserCollection([]);
      }
    }
    fetchCollection();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only save if scroll position changed significantly (more than 50px)
      if (Math.abs(currentScrollY - scrollRestorationState.current.lastScrollY) > 50) {
        sessionStorage.setItem('scrollY', currentScrollY.toString());
        scrollRestorationState.current.lastScrollY = currentScrollY;
      }
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

  // Enhanced scroll restoration coordination
  useEffect(() => {
    if (countryId && countryId !== scrollRestorationState.current.lastCountryId) {
      console.log(`[CountryDetail] Country changed to: ${countryId}`);
      
      // Reset scroll restoration state for new country
      scrollRestorationState.current.attempted = false;
      scrollRestorationState.current.lastCountryId = countryId;
      
      // Add specific debugging for Jordan
      if (countryId === 'cecd8325-a13c-430f-994c-12e82663b7fb') {
        console.log(`[CountryDetail] Jordan detected, checking scroll restoration state`);
        
        // Check if we have saved scroll data for Jordan
        const savedScrollData = sessionStorage.getItem(`scroll-${countryId}`);
        if (savedScrollData) {
          try {
            const parsedData = JSON.parse(savedScrollData);
            console.log(`[CountryDetail] Found saved scroll data for Jordan:`, parsedData);
          } catch (error) {
            console.error(`[CountryDetail] Error parsing Jordan scroll data:`, error);
          }
        } else {
          console.log(`[CountryDetail] No saved scroll data found for Jordan`);
        }
      }
    }
  }, [countryId]);

  // Fetch sultan order map when country changes
  useEffect(() => {
    if (countryId) {
      getSultanOrderMap(countryId)
        .then(map => {
          setSultanOrderMap(map);
        })
        .catch(error => {
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
    // Mark preferences as loaded when filter changes come from BanknoteFilterCatalog
    setPreferencesLoaded(true);
  }, []);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    flushSync(() => {
      setViewMode(mode);
    });
  }, []);



  // Handle preferences loaded callback
  const handlePreferencesLoaded = useCallback(() => {
    setPreferencesLoaded(true);
  }, []);



  // Calculate loading state - don't wait for preferences loading
  const isLoading = countryLoading || banknotesLoading;
  
  

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

          {/* Only render BanknoteDisplay after preferences are loaded to prevent default view mode flash */}
          {preferencesLoaded && (
            <BanknoteDisplay
              groups={groupedItems}
              showSultanGroups={filters.sort.includes('sultan')}
              viewMode={viewMode}
              countryId={countryId}
              isLoading={isLoading}
              groupMode={groupMode}
              userCollection={userCollection}
              filters={filters}
            />
          )}
          
          {/* Show loading state when preferences haven't loaded yet */}
          {!preferencesLoaded && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>
    </WishlistProvider>
  );
};

export default CountryDetail;
