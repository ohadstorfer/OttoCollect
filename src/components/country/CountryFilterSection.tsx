import React, { useCallback, memo } from "react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { BanknoteFilterCollection } from "@/components/filter/BanknoteFilterCollection";
import { DynamicFilterState } from "@/types/filter";

interface CountryFilterSectionProps {
  countryId: string;
  countryName: string;
  filters: DynamicFilterState;
  onFilterChange: (newFilters: Partial<DynamicFilterState>) => void;
  isLoading: boolean;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  groupMode: boolean;
  onGroupModeChange: (mode: boolean) => void;
  source?: 'catalog' | 'collection';
  collectionCategories?: { id: string; name: string; count: number }[];
  collectionTypes?: { id: string; name: string; count: number }[];
  onPreferencesLoaded?: () => void;
  activeTab?: 'collection' | 'wishlist' | 'missing';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing') => void;
  isOwner?: boolean;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  onBackToCountries?: () => void;
}

// Use React.memo to prevent unnecessary re-renders
export const CountryFilterSection: React.FC<CountryFilterSectionProps> = memo(({
  countryId,
  countryName,
  filters,
  onFilterChange,
  isLoading,
  onViewModeChange,
  groupMode,
  onGroupModeChange,
  source = 'catalog',
  collectionCategories = [],
  collectionTypes = [],
  onPreferencesLoaded,
  activeTab,
  onTabChange,
  isOwner = false,
  profileUser,
  onBackToCountries
}) => {
  // Memoize handleFilterChange to prevent it from causing re-renders
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Decide which filter component to render based on source
  if (source === 'collection') {
    return (
      <BanknoteFilterCollection
        countryId={countryId}
        countryName={countryName}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        isLoading={isLoading}
        onViewModeChange={onViewModeChange}
        groupMode={groupMode}
        onGroupModeChange={onGroupModeChange}
        onPreferencesLoaded={onPreferencesLoaded}
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOwner={isOwner}
        profileUser={profileUser}
        onBackToCountries={onBackToCountries}
      />
    );
  }
  
  return countryId ? (
    <BanknoteFilterCatalog
      countryId={countryId}
      countryName={countryName}
      onFilterChange={handleFilterChange}
      currentFilters={filters}
      isLoading={isLoading}
      onViewModeChange={onViewModeChange}
      groupMode={groupMode}
      onGroupModeChange={onGroupModeChange}
      onPreferencesLoaded={onPreferencesLoaded}
    />
  ) : null;
});

// Add a display name for the memoized component
CountryFilterSection.displayName = 'CountryFilterSection';
