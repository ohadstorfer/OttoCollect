import React, { useCallback, memo } from "react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { BanknoteFilterCollection } from "@/components/filter/BanknoteFilterCollection";
import { DynamicFilterState } from "@/types/filter";
import { CollectionItem } from "@/types";

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
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing' | 'sale') => void;
  isOwner?: boolean;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  onBackToCountries?: () => void;
  collectionItems?: CollectionItem[];
}

// Custom comparison function to ensure re-renders when viewMode or groupMode change
const areEqual = (prevProps: CountryFilterSectionProps, nextProps: CountryFilterSectionProps) => {
  // Always re-render if viewMode or groupMode change
  if (prevProps.viewMode !== nextProps.viewMode || prevProps.groupMode !== nextProps.groupMode) {
    console.log('CountryFilterSection: Re-rendering due to viewMode or groupMode change', {
      prevViewMode: prevProps.viewMode,
      nextViewMode: nextProps.viewMode,
      prevGroupMode: prevProps.groupMode,
      nextGroupMode: nextProps.groupMode
    });
    return false;
  }
  
  // Re-render if other important props change
  if (prevProps.countryId !== nextProps.countryId || 
      prevProps.isLoading !== nextProps.isLoading ||
      prevProps.source !== nextProps.source) {
    return false;
  }
  
  return true;
};

// Use React.memo with custom comparison to ensure re-renders when viewMode or groupMode change
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
  onBackToCountries,
  collectionItems
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
        collectionItems={collectionItems}
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
}, areEqual);

// Add a display name for the memoized component
CountryFilterSection.displayName = 'CountryFilterSection';
