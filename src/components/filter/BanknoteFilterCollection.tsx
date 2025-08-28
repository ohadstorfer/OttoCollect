import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DynamicFilterState,
  FilterCategoryOption,
  CollectionItem,
} from '@/types';
import { ToggleGroup } from '@/components/shared/ToggleGroup';
import { Toggle } from '@/components/ui/toggle';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast"

interface BanknoteFilterCollectionProps {
  countryId: string;
  onFilterChange: (newFilters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  categories: FilterCategoryOption[];
  types: FilterCategoryOption[];
  sortOptions: FilterCategoryOption[];
  groupMode: boolean;
  onGroupModeChange: (enabled: boolean) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  isLoading: boolean;
  totalItems: number;
  collectionTypes: { id: string; name: string }[];
  collectionItems: CollectionItem[];
}

const BanknoteFilterCollection = ({
  countryId,
  onFilterChange,
  currentFilters,
  categories,
  types,
  sortOptions,
  groupMode,
  onGroupModeChange,
  viewMode = 'grid',
  onViewModeChange,
  isLoading,
  totalItems,
  collectionTypes,
  collectionItems,
}: BanknoteFilterCollectionProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isGridView, setIsGridView] = useState(viewMode === 'grid');

  const handleViewModeChange = useCallback((newMode: 'grid' | 'list') => {
    setIsGridView(newMode === 'grid');
    onViewModeChange?.(newMode);
  }, [onViewModeChange]);

  useEffect(() => {
    setIsGridView(viewMode === 'grid');
  }, [viewMode]);

  const handleCategoryChange = (selectedCategories: string[]) => {
    onFilterChange({ categories: selectedCategories });
  };

  const handleTypeChange = (selectedTypes: string[]) => {
    onFilterChange({ types: selectedTypes });
  };

  const handleSortChange = (selectedSorts: string[]) => {
    onFilterChange({ sort: selectedSorts });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleGroupModeChange = (enabled: boolean) => {
    onGroupModeChange(enabled);
  };

  const handleResetFilters = () => {
    onFilterChange({
      search: '',
      categories: [],
      types: [],
      sort: [],
    });
    toast({
      title: "Filters Reset",
      description: "All filters have been reset to their default values.",
    })
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('filter:title')}</h2>
        <button onClick={handleResetFilters} className="text-sm text-blue-500 hover:underline">
          {t('filter:reset')}
        </button>
      </div>

      {/* Search Bar */}
      <div>
        <Label htmlFor="search">{t('filter:search.label')}</Label>
        <input
          type="text"
          id="search"
          placeholder={t('filter:search.placeholder')}
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-500"
          onChange={handleSearchChange}
          defaultValue={currentFilters.search}
        />
      </div>

      {/* Category Filter */}
      <div>
        <Label>{t('filter:categories.label')}</Label>
        <ToggleGroup
          items={categories}
          selected={currentFilters.categories}
          onSelectedChange={handleCategoryChange}
          isLoading={isLoading}
        />
      </div>

      {/* Type Filter */}
      <div>
        <Label>{t('filter:types.label')}</Label>
        <ToggleGroup
          items={types}
          selected={currentFilters.types}
          onSelectedChange={handleTypeChange}
          isLoading={isLoading}
        />
      </div>

      {/* Sort Options */}
      <div>
        <Label>{t('filter:sortBy.label')}</Label>
        <ToggleGroup
          items={sortOptions}
          selected={currentFilters.sort}
          onSelectedChange={handleSortChange}
          isLoading={isLoading}
        />
      </div>

      {/* Group Mode Toggle */}
      <div className="flex items-center space-x-2">
        <Toggle
          id="group-mode"
          aria-label="Enable Group Mode"
          onChecked={groupMode}
          onClick={() => handleGroupModeChange(!groupMode)}
        />
        <Label htmlFor="group-mode">{t('filter:groupBy.label')}</Label>
      </div>

      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex items-center space-x-2">
          <Label>{t('filter:viewMode.label')}</Label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`px-3 py-1 rounded-md ${isGridView ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
            >
              {t('filter:viewMode.grid')}
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1 rounded-md ${!isGridView ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
            >
              {t('filter:viewMode.list')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanknoteFilterCollection;
