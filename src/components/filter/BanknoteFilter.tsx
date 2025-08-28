import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Search, Filter, RotateCcw } from 'lucide-react';
import { DynamicFilterState, FilterCategoryOption } from '@/types/filter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface BanknoteFilterProps {
  filters: DynamicFilterState;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  isLoading?: boolean;
  countries?: FilterCategoryOption[];
  categories?: FilterCategoryOption[];
  types?: FilterCategoryOption[];
  sortOptions?: FilterCategoryOption[];
  showCountryFilter?: boolean;
  showAdvancedFilters?: boolean;
}

const BanknoteFilter = ({ filters, onFilterChange, isLoading }: BanknoteFilterProps) => {
  const { t } = useTranslation();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSearchSubmit = () => {
    onFilterChange({ search: searchValue });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = filters.categories || [];
    const newCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter(id => id !== categoryId);
    
    onFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (typeId: string, checked: boolean) => {
    const currentTypes = filters.types || [];
    const newTypes = checked
      ? [...currentTypes, typeId]
      : currentTypes.filter(id => id !== typeId);
    
    onFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    const currentSort = filters.sort || [];
    const newSort = checked
      ? [...currentSort, sortId]
      : currentSort.filter(id => id !== sortId);
    
    onFilterChange({ sort: newSort });
  };

  const handleCountryChange = (countryId: string, checked: boolean) => {
    const currentCountries = filters.countries || [];
    const newCountries = checked
      ? [...currentCountries, countryId]
      : currentCountries.filter(id => id !== countryId);
    
    onFilterChange({ countries: newCountries });
  };

  const clearAllFilters = () => {
    setSearchValue('');
    onFilterChange({
      search: '',
      categories: [],
      types: [],
      sort: [],
      countries: []
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.categories?.length) count += filters.categories.length;
    if (filters.types?.length) count += filters.types.length;
    if (filters.sort?.length) count += filters.sort.length;
    if (filters.countries?.length) count += filters.countries.length;
    return count;
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'search':
        setSearchValue('');
        onFilterChange({ search: '' });
        break;
      case 'category':
        if (value) {
          const newCategories = (filters.categories || []).filter(id => id !== value);
          onFilterChange({ categories: newCategories });
        }
        break;
      case 'type':
        if (value) {
          const newTypes = (filters.types || []).filter(id => id !== value);
          onFilterChange({ types: newTypes });
        }
        break;
      case 'sort':
        if (value) {
          const newSort = (filters.sort || []).filter(id => id !== value);
          onFilterChange({ sort: newSort });
        }
        break;
      case 'country':
        if (value) {
          const newCountries = (filters.countries || []).filter(id => id !== value);
          onFilterChange({ countries: newCountries });
        }
        break;
    }
  };

  const placeholders = {
    search: t('filter:search.placeholder'),
    country: t('filter:country.placeholder'),
    categories: t('filter:categories.placeholder'),
    types: t('filter:types.placeholder'),
    sortBy: t('filter:sortBy.placeholder'),
    groupBy: t('filter:groupBy.placeholder'),
    viewMode: t('filter:viewMode.placeholder'),
    reset: t('filter:reset')
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filter:title')}
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          {getActiveFilterCount() > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {placeholders.reset}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">{t('filter:search.label')}</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              placeholder={placeholders.search}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button
              onClick={handleSearchSubmit}
              disabled={isLoading}
              size="icon"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {getActiveFilterCount() > 0 && (
          <div className="space-y-2">
            <Label>{t('filter:activeFilters')}</Label>
            <div className="flex flex-wrap gap-2">
              {filters.search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {t('filter:search.label')}: {filters.search}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('search')}
                  />
                </Badge>
              )}
              {filters.categories?.map(categoryId => (
                <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                  {t('filter:category')}: {categoryId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('category', categoryId)}
                  />
                </Badge>
              ))}
              {filters.types?.map(typeId => (
                <Badge key={typeId} variant="secondary" className="flex items-center gap-1">
                  {t('filter:type')}: {typeId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('type', typeId)}
                  />
                </Badge>
              ))}
              {filters.sort?.map(sortId => (
                <Badge key={sortId} variant="secondary" className="flex items-center gap-1">
                  {t('filter:sort')}: {sortId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('sort', sortId)}
                  />
                </Badge>
              ))}
              {filters.countries?.map(countryId => (
                <Badge key={countryId} variant="secondary" className="flex items-center gap-1">
                  {t('filter:country')}: {countryId}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFilter('country', countryId)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              {t('filter:advancedFilters')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Categories */}
            <div className="space-y-2">
              <Label>{t('filter:categories.label')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Category checkboxes would go here */}
              </div>
            </div>

            {/* Types */}
            <div className="space-y-2">
              <Label>{t('filter:types.label')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Type checkboxes would go here */}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <Label>{t('filter:sort.label')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Sort checkboxes would go here */}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default BanknoteFilter;
