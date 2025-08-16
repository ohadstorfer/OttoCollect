import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { BanknoteDisplay } from "@/components/country/BanknoteDisplay";
import { useCountryData } from "@/hooks/use-country-data";
import { useBanknoteFetching } from "@/hooks/use-banknote-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import type { DetailedBanknote, CollectionItem } from "@/types";

interface CountryDetailMissingItemsProps {
  missingBanknotes?: DetailedBanknote[];
  userCollection?: CollectionItem[];
  countryId?: string;
  countryName?: string;
  filters?: DynamicFilterState;
  onFilterChange?: (newFilters: Partial<DynamicFilterState>) => void;
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
  groups?: any[];
  showSultanGroups?: boolean;
  isOwner?: boolean;
}
const CountryDetailMissingItems: React.FC<CountryDetailMissingItemsProps> = ({
  missingBanknotes,
  userCollection,
  countryId: propCountryId,
  countryName: propCountryName,
  filters: propFilters,
  onFilterChange: propOnFilterChange,
  isLoading: propIsLoading,
  viewMode: propViewMode,
  groupMode: propGroupMode,
  onGroupModeChange: propOnGroupModeChange,
  groups: propGroups,
  showSultanGroups: propShowSultanGroups,
  isOwner: propIsOwner
}) => {
  // Determines if presentational mode (render only props, not fetching)
  const isPresentational = !!missingBanknotes;

  // Parameter-based loading (for legacy route usage, fallback)
  const { country: routeCountryParam } = useParams();
  const navigate = useNavigate();
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [internalFilters, setInternalFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });

  const { user } = useAuth();
  const [localUserCollection, setLocalUserCollection] = useState<CollectionItem[]>([]);

  // Use controlled or internal state
  const filters = propFilters || internalFilters;
  const onFilterChange = propOnFilterChange || ((newFilters: Partial<DynamicFilterState>) => setInternalFilters(prev => ({ ...prev, ...newFilters })));
  const viewMode = propViewMode || internalViewMode;
  const setViewMode = propViewMode ? propOnFilterChange as any : setInternalViewMode; // Only use setInternalViewMode if uncontrolled

  // Mode 1: Presentational (controlled via props)
  let renderCountryId: string | undefined = isPresentational ? propCountryId : undefined;
  let renderCountryName: string | undefined = isPresentational ? propCountryName : undefined;
  let banknotes: DetailedBanknote[] = [];
  let collection: CollectionItem[] = [];

  if (isPresentational && missingBanknotes) {
    // Provided via props
    banknotes = missingBanknotes;
    collection = userCollection ?? [];
    renderCountryId = propCountryId;
    renderCountryName = propCountryName;
  } else {
    // Parameter-based (from route)
    renderCountryId = undefined;
    renderCountryName = routeCountryParam ? decodeURIComponent(routeCountryParam) : undefined;
  }

  // For legacy behavior: fetch user collection if not provided via prop
  useEffect(() => {
    if (isPresentational || !user) return;
    const fetchCollection = async () => {
      try {
        const collection = await fetchUserCollection(user.id);
        setLocalUserCollection(collection);
      } catch {
        setLocalUserCollection([]);
      }
    };
    fetchCollection();
  }, [user, isPresentational]);

  // For presentational: skip fetching country data, banknotes, sorting, grouping
  // For usage via route, fetch via hooks
  const {
    countryId,
    categoryOrder,
    currencies,
    loading: countryLoading,
    groupMode,
    handleGroupModeChange
  } = useCountryData({
    countryName: renderCountryName || "",
    navigate
  });

  const { banknotes: fetchedBanknotes, loading: banknotesLoading } = useBanknoteFetching({
    countryId,
    filters
  });


  

  const isLoading = typeof propIsLoading === 'boolean' ? propIsLoading : (countryLoading || banknotesLoading);

  // Use provided userCollection if present (for presentational mode), otherwise use local fetched one.
  const displayUserCollection = isPresentational ? collection : localUserCollection;

 


  return (
    <div className="w-full px-2 sm:px-6 py-1">

      {/* <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <CountryFilterSection
          countryId={renderCountryId ?? countryId}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          onViewModeChange={handleViewModeChange}
          groupMode={groupMode}
          onGroupModeChange={handleGroupModeChange}
        /> */}

        <BanknoteDisplay
          groups={propGroups}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          userCollection={displayUserCollection}
          filters={filters}
        />
      {/* </div> */}
    </div>
  );
};

export default CountryDetailMissingItems;

