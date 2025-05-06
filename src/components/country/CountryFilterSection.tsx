
import React, { useCallback, memo } from "react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { BanknoteFilterCollection } from "@/components/filter/BanknoteFilterCollection";
import { DynamicFilterState } from "@/types/filter";

interface CountryFilterSectionProps {
  countryId: string;
  filters: DynamicFilterState;
  onFilterChange: (newFilters: Partial<DynamicFilterState>) => void;
  isLoading: boolean;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  groupMode: boolean;
  onGroupModeChange: (mode: boolean) => void;
  source?: 'catalog' | 'collection';
  collectionCategories?: { id: string; name: string; count: number }[];
  collectionTypes?: { id: string; name: string; count: number }[];
}

// Use React.memo to prevent unnecessary re-renders
export const CountryFilterSection: React.FC<CountryFilterSectionProps> = memo(({
  countryId,
  filters,
  onFilterChange,
  isLoading,
  onViewModeChange,
  groupMode,
  onGroupModeChange,
  source = 'catalog',
  collectionCategories = [],
  collectionTypes = []
}) => {
  // Memoize handleFilterChange to prevent it from causing re-renders
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Decide which filter component to render based on source
  if (source === 'collection' || 'CountryDetailCollection') {
    return (
      <BanknoteFilterCollection
      countryId={countryId}
      onFilterChange={handleFilterChange}
      currentFilters={filters}
      isLoading={isLoading}
      onViewModeChange={onViewModeChange}
      groupMode={groupMode}
      onGroupModeChange={onGroupModeChange}
    />
    );
  }
  
  return countryId ? (
    <BanknoteFilterCatalog
      countryId={countryId}
      onFilterChange={handleFilterChange}
      currentFilters={filters}
      isLoading={isLoading}
      onViewModeChange={onViewModeChange}
      groupMode={groupMode}
      onGroupModeChange={onGroupModeChange}
    />
  ) : null;
});

// Add a display name for the memoized component
CountryFilterSection.displayName = 'CountryFilterSection';
