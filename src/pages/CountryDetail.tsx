import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { banknoteMatchesSearch } from "@/utils/pickSearch";
import { CollectionItem, fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { useCountryFilters } from "@/hooks/useCountryFilters";
import { WishlistProvider } from "@/context/WishlistContext";
import SEOHead from "@/components/seo/SEOHead";

const CountryDetail = () => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // New: collection loading
  const [userCollection, setUserCollection] = useState<CollectionItem[]>([]);

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
    countryData,
    categoryOrder,
    sultans,
    currencies,
    loading: countryLoading
  } = useCountryData({
    countryName: country || "",
    navigate
  });

  // Shared filter store is the single source of truth for catalog filters,
  // view mode, group mode and search. The hook owns hydration + persistence.
  const { state: cf, setViewMode: cfSetViewMode, setGroupMode: cfSetGroupMode, patch: cfPatch } =
    useCountryFilters(countryId, country ? decodeURIComponent(country) : '');

  const filters: DynamicFilterState = useMemo(() => ({
    search: cf.search,
    categories: cf.categories,
    types: cf.types,
    sort: cf.sort,
    imagesOnly: cf.imagesOnly,
  }), [cf.search, cf.categories, cf.types, cf.sort, cf.imagesOnly]);

  const viewMode = cf.viewMode;
  const groupMode = cf.groupMode;
  const preferencesLoaded = cf.hydrated;

  // Reset search on catalog switch. The store keeps a per-country slice, but a
  // search term should not survive moving between catalogs (only same-catalog
  // navigation like detail -> back).
  const lastCountryRef = useRef('');
  useEffect(() => {
    if (!country) return;
    if (lastCountryRef.current && lastCountryRef.current !== country && cf.search) {
      cfPatch({ search: '' });
    }
    lastCountryRef.current = country;
  }, [country, cf.search, cfPatch]);

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

  // Text search is applied client-side over the cached country result so that
  // pick-number matching is dot/prefix-insensitive (Option A). The server query
  // no longer filters by search (see banknoteService / use-banknote-query).
  const searchedBanknotes = useMemo(
    () => (filters.search?.trim()
      ? banknotes.filter(b => banknoteMatchesSearch(b, filters.search))
      : banknotes),
    [banknotes, filters.search]
  );

  const sortedBanknotes = useOptimizedBanknoteSorting({
    banknotes: searchedBanknotes,
    currencies,
    sortFields: filters.sort
  });

  const groupedItems = useOptimizedBanknoteGroups({
    banknotes: sortedBanknotes,
    sortFields: filters.sort,
    categoryOrder,
    sultans,
    countryId,
    sultanOrderMap
  });
  


  // Extract banknote IDs for wishlist context
  const banknoteIds = banknotes.map(banknote => banknote.id);

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    const { search, categories, types, sort, imagesOnly } = newFilters;
    const partial: Record<string, unknown> = {};
    if (search !== undefined) partial.search = search;
    if (categories !== undefined) partial.categories = categories;
    if (types !== undefined) partial.types = types;
    if (sort !== undefined) partial.sort = sort;
    if (imagesOnly !== undefined) partial.imagesOnly = imagesOnly;
    cfPatch(partial);
  }, [cfPatch]);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    flushSync(() => { cfSetViewMode(mode); });
  }, [cfSetViewMode]);

  const handleGroupModeChange = useCallback((mode: boolean) => {
    cfSetGroupMode(mode);
  }, [cfSetGroupMode]);

  const handlePreferencesLoaded = useCallback(() => { /* hydration owns this now */ }, []);



  // Calculate loading state - don't wait for preferences loading
  const isLoading = countryLoading || banknotesLoading;
  
  

  // Generate SEO data for this country catalog page
  const countryName = countryData?.name || country || '';
  const encodedCountry = encodeURIComponent(countryName);
  
  const seoData = {
    title: `${countryName} Banknotes | OttoCollect`,
    description: `Browse ${countryName} banknotes from Ottoman Empire period. Historical banknotes 1840-1948 with detailed info, images, and collector data.`,
    keywords: [
      `${countryName} banknotes`,
      'Ottoman Empire banknotes',
      'historical banknotes',
      'banknote catalog',
      'numismatics',
      'collector banknotes',
      countryData?.name_ar || '',
      countryData?.name_tr || ''
    ].filter(Boolean),
    canonical: 'https://ottocollect.com/catalog/',
    image: `https://ottocollect.com/images/${country?.toLowerCase().replace(/\s+/g, '-') || 'ottoman-empire'}.jpg`,
    type: 'collection' as const,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${countryName} Banknote Catalog`,
      "description": `Comprehensive catalog of ${countryName} banknotes from the Ottoman Empire period`,
      "url": `https://ottocollect.com/catalog/${encodedCountry}`,
      "isPartOf": {
        "@type": "WebSite",
        "name": "OttoCollect Banknote Catalog",
        "url": "https://ottocollect.com/catalog/"
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": `${countryName} Banknotes`,
        "description": `Historical banknotes from ${countryName}`,
        "numberOfItems": banknotes?.length || 0
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ottocollect.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Catalog",
            "item": "https://ottocollect.com/catalog/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": countryName,
            "item": `https://ottocollect.com/catalog/${encodedCountry}`
          }
        ]
      }
    }
  };

  return (
    <>
      <SEOHead {...seoData} />
      <WishlistProvider banknoteIds={banknoteIds}>
        <div className="w-full px-2 sm:px-6 py-8 -mb-10">
        <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
          <CountryFilterSection
            countryId={countryId}
            countryName={country ? decodeURIComponent(country) : ""}
            countryNameAr={countryData?.name_ar}
            countryNameTr={countryData?.name_tr}
            filters={filters}
            onFilterChange={handleFilterChange}
            isLoading={isLoading}
            viewMode={viewMode}
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
    </>
  );
};

export default CountryDetail;
