
import React, { useState, useCallback, useEffect } from "react";
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
  // Presentational props (optional)
  missingBanknotes?: DetailedBanknote[];
  userCollection?: CollectionItem[];
  countryId?: string;
  countryName?: string;
  // Optionally, control viewMode, filters externally.
}
const CountryDetailMissingItems: React.FC<CountryDetailMissingItemsProps> = ({
  missingBanknotes,
  userCollection,
  countryId: propCountryId,
  countryName: propCountryName,
}) => {
  // Determines if presentational mode (render only props, not fetching)
  const isPresentational = !!missingBanknotes;

  // Parameter-based loading (for legacy route usage, fallback)
  const { country: routeCountryParam } = useParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });

  const { user } = useAuth();
  const [localUserCollection, setLocalUserCollection] = useState<CollectionItem[]>([]);

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

  // For presentational, group/organize the passed-in missingBanknotes
  const sortedBanknotes = isPresentational
    ? banknotes
    : useBanknoteSorting({
        banknotes: fetchedBanknotes,
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

  // Use provided userCollection if present (for presentational mode), otherwise use local fetched one.
  const displayUserCollection = isPresentational ? collection : localUserCollection;

  return (
    <div className="w-full px-2 sm:px-6 py-8">
      <CountryHeader countryName={renderCountryName || ""} />

      <div className="bg-card border rounded-lg p-1 sm:p-6 mb-6 sm:w-[95%] w-auto mx-auto">
        <CountryFilterSection
          countryId={renderCountryId ?? countryId}
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
          countryId={renderCountryId ?? countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          userCollection={displayUserCollection}
        />
      </div>
    </div>
  );
};

export default CountryDetailMissingItems;

