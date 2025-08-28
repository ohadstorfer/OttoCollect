import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FilterCategoryOption, DynamicFilterState } from '@/types/filter';
import CategoryFilter from '@/components/filter/CategoryFilter';
import TypeFilter from '@/components/filter/TypeFilter';
import SortFilter from '@/components/filter/SortFilter';
import ViewModeToggle from '@/components/filter/ViewModeToggle';
import { Skeleton } from "@/components/ui/skeleton"

interface CountryFilterSectionProps {
  countryId: string;
  countryName: string;
  filters: DynamicFilterState;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  isLoading: boolean;
  categories: FilterCategoryOption[];
  types: FilterCategoryOption[];
  sortOptions: FilterCategoryOption[];
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode: boolean;
  onGroupModeChange: (enabled: boolean) => void;
  totalItems: number;
  collectionTypes: { id: string; name: string }[];
}

const CountryFilterSection = ({
  countryId,
  countryName,
  filters,
  onFilterChange,
  isLoading,
  categories,
  types,
  sortOptions,
  viewMode = 'grid',
  onViewModeChange,
  groupMode,
  onGroupModeChange,
  totalItems,
  collectionTypes,
}: CountryFilterSectionProps) => {
  const { t } = useTranslation();

  const handleCategoryChange = useCallback(
    (selectedCategories: string[]) => {
      onFilterChange({ categories: selectedCategories });
    },
    [onFilterChange]
  );

  const handleTypeChange = useCallback(
    (selectedTypes: string[]) => {
      onFilterChange({ types: selectedTypes });
    },
    [onFilterChange]
  );

  const handleSortChange = useCallback(
    (selectedSorts: string[]) => {
      onFilterChange({ sort: selectedSorts });
    },
    [onFilterChange]
  );

  const handleViewModeChange = useCallback(
    (mode: 'grid' | 'list') => {
      onViewModeChange?.(mode);
    },
    [onViewModeChange]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{countryName}</h2>
        <span className="text-sm text-muted-foreground">
          {t('filter:totalItems', { count: totalItems })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <CategoryFilter
            countryId={countryId}
            selectedCategories={filters.categories}
            onCategoryChange={handleCategoryChange}
            isLoading={isLoading}
            categories={categories}
          />
        </div>

        <div>
          <TypeFilter
            countryId={countryId}
            selectedTypes={filters.types}
            onTypeChange={handleTypeChange}
            isLoading={isLoading}
            types={types}
            collectionTypes={collectionTypes}
          />
        </div>

        <div>
          <SortFilter
            countryId={countryId}
            selectedSorts={filters.sort}
            onSortChange={handleSortChange}
            isLoading={isLoading}
            sortOptions={sortOptions}
          />
        </div>

        <div className="flex items-center justify-between">
          <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} />
          <div className="space-x-2 flex items-center">
            <Label htmlFor="group-mode">{t('filter:groupMode')}</Label>
            <Switch
              id="group-mode"
              checked={groupMode}
              onCheckedChange={onGroupModeChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryFilterSection;
