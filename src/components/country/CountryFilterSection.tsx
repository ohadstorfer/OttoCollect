
import React, { useCallback } from "react";
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

export const CountryFilterSection: React.FC<CountryFilterSectionProps> = ({
  countryId,
  filters,
  onFilterChange,
  isLoading,
  onViewModeChange,
  groupMode,
  onGroupModeChange
}) => {
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
};
