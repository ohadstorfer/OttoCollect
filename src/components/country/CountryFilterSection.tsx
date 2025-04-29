
import React, { useCallback, memo } from "react";
import { BanknoteFilterCatalog } from "@/components/filter/BanknoteFilterCatalog";
import { DynamicFilterState } from "@/types/filter";

interface CountryFilterSectionProps {
  countryId: string;
  filters: DynamicFilterState;
  onFilterChange: (newFilters: Partial<DynamicFilterState>) => void;
  isLoading: boolean;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  groupMode: boolean;
  onGroupModeChange: (mode: boolean) => void;
}

// Use React.memo to prevent unnecessary re-renders
export const CountryFilterSection: React.FC<CountryFilterSectionProps> = memo(({
  countryId,
  filters,
  onFilterChange,
  isLoading,
  onViewModeChange,
  groupMode,
  onGroupModeChange
}) => {
  // Memoize handleFilterChange to prevent it from causing re-renders
  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    onFilterChange(newFilters);
  }, [onFilterChange]);

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
