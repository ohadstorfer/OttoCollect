import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  LayoutList, 
  Save,
  Layers,
  ArrowLeft,
  ArrowUpDown,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { DynamicFilterState } from "@/types/filter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { withHighlight } from "./withHighlight";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

export type FilterOption = {
  id: string;
  name: string;
  count?: number;
  isRequired?: boolean;
  fieldName?: string;
};

export type BaseBanknoteFilterProps = {
  categories: FilterOption[];
  types: FilterOption[];
  sortOptions: FilterOption[];
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onSaveFilters?: () => void;
  saveButtonText?: string;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
  countryName?: string;
  countries?: FilterOption[]; // Add countries support for marketplace
};

export const BaseBanknoteFilter: React.FC<BaseBanknoteFilterProps> = ({
  categories,
  types,
  sortOptions,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onSaveFilters,
  saveButtonText = "Save Filter Preferences",
  viewMode = 'grid',
  onViewModeChange,
  groupMode = false,
  onGroupModeChange,
  countryName,
  countries = []
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation(['filter']);
  const { direction } = useLanguage();
  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  
  // Local state for immediate UI updates
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const [localGroupMode, setLocalGroupMode] = useState(groupMode);
  
  const [search, setSearch] = useState(currentFilters.search || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentFilters.types || []);
  const [selectedSort, setSelectedSort] = useState<string[]>(currentFilters.sort || []);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(currentFilters.countries || []);
  
  const isLocalChange = useRef(false);
  const prevFiltersRef = useRef<DynamicFilterState | null>(null);

  // Sync local state with props
  useEffect(() => {
    setLocalViewMode(viewMode);
    console.log("BaseBanknoteFilter: viewMode prop changed to:", viewMode);
  }, [viewMode]);

  useEffect(() => {
    setLocalGroupMode(groupMode);
    console.log("BaseBanknoteFilter: groupMode prop changed to:", groupMode);
  }, [groupMode]);

  useEffect(() => {
    if (isLocalChange.current) {
      console.log("BaseBanknoteFilter: Skipping sync due to local changes being applied");
      return;
    }
    
    const currentFilterStr = JSON.stringify({
      search: currentFilters.search,
      categories: currentFilters.categories,
      types: currentFilters.types,
      sort: currentFilters.sort,
      countries: currentFilters.countries
    });
    
    const prevFiltersStr = prevFiltersRef.current ? JSON.stringify({
      search: prevFiltersRef.current.search,
      categories: prevFiltersRef.current.categories,
      types: prevFiltersRef.current.types,
      sort: prevFiltersRef.current.sort,
      countries: prevFiltersRef.current.countries
    }) : null;
    
    if (prevFiltersStr === currentFilterStr) {
      console.log("BaseBanknoteFilter: Skipping sync, no changes detected");
      return;
    }

    console.log("BaseBanknoteFilter: Syncing local state with currentFilters", currentFilters);
    prevFiltersRef.current = { ...currentFilters };
    
    setSearch(currentFilters.search || "");
    setSelectedCategories(currentFilters.categories || []);
    setSelectedTypes(currentFilters.types || []);
    setSelectedSort(currentFilters.sort || []);
    setSelectedCountries(currentFilters.countries || []);
  }, [currentFilters]);

  const handleFilterChange = (changes: Partial<DynamicFilterState>) => {
    console.log("BaseBanknoteFilter: Local filter change:", changes);
    
    isLocalChange.current = true;
    
    if (changes.search !== undefined) setSearch(changes.search);
    if (changes.categories !== undefined) setSelectedCategories(changes.categories);
    if (changes.types !== undefined) setSelectedTypes(changes.types);
    if (changes.sort !== undefined) setSelectedSort(changes.sort);
    if (changes.countries !== undefined) setSelectedCountries(changes.countries);
    
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
      countries: changes.countries !== undefined ? changes.countries : selectedCountries,
      country_id: currentFilters.country_id
    };
    
    prevFiltersRef.current = { ...newFilters };
    onFilterChange(newFilters);

    // Automatically save preferences after each change
    if (onSaveFilters) {
      console.log("BaseBanknoteFilter: Auto-saving filter preferences");
      onSaveFilters();
    }
    
    setTimeout(() => {
      isLocalChange.current = false;
    }, 200);
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      console.log("BaseBanknoteFilter: Debounced search with value:", value);
      handleFilterChange({ search: value });
    }, 100), // Reduced debounce time
    [handleFilterChange] // Changed dependency to handleFilterChange
  );

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Category change:", { categoryId, checked });
    
    let newCategories: string[];
    
    if (categoryId === "all") {
      // If "All Categories" is clicked and not all are currently selected, select all
      // If all are already selected, do nothing (don't clear all)
      if (allCategoriesSelected) {
        console.log("BaseBanknoteFilter: All categories already selected, doing nothing");
        return;
      } else {
        newCategories = categories.map(c => c.id);
      }
    } else {
      if (checked) {
        // Adding a category
        newCategories = [...selectedCategories, categoryId];
      } else {
        // Removing a category - prevent removing the last one
        if (selectedCategories.length <= 1) {
          console.log("BaseBanknoteFilter: Cannot remove last category, doing nothing");
          return;
        }
        newCategories = selectedCategories.filter(id => id !== categoryId);
      }
    }
    
    console.log("BaseBanknoteFilter: New categories:", newCategories);
    handleFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (typeId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Type change:", { typeId, checked });
    
    let newTypes: string[];
    
    if (typeId === "all") {
      // If "All Types" is clicked and not all are currently selected, select all
      // If all are already selected, do nothing (don't clear all)
      if (allTypesSelected) {
        console.log("BaseBanknoteFilter: All types already selected, doing nothing");
        return;
      } else {
        newTypes = types.map(t => t.id);
      }
    } else {
      if (checked) {
        // Adding a type
        newTypes = [...selectedTypes, typeId];
      } else {
        // Removing a type - prevent removing the last one
        if (selectedTypes.length <= 1) {
          console.log("BaseBanknoteFilter: Cannot remove last type, doing nothing");
          return;
        }
        newTypes = selectedTypes.filter(id => id !== typeId);
      }
    }
    
    console.log("BaseBanknoteFilter: New types:", newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleCountryChange = (countryId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Country change:", { countryId, checked });
    
    const allCountriesSelected = countries.length > 0 && 
      countries.every(country => selectedCountries.includes(country.id));
    
    let newCountries: string[];
    
    if (countryId === "all") {
      // If "All Countries" is clicked and not all are currently selected, select all
      // If all are already selected, do nothing (don't clear all)
      if (allCountriesSelected) {
        console.log("BaseBanknoteFilter: All countries already selected, doing nothing");
        return;
      } else {
        newCountries = countries.map(c => c.id);
      }
    } else {
      if (checked) {
        // Adding a country
        newCountries = [...selectedCountries, countryId];
      } else {
        // Removing a country - prevent removing the last one
        if (selectedCountries.length <= 1) {
          console.log("BaseBanknoteFilter: Cannot remove last country, doing nothing");
          return;
        }
        newCountries = selectedCountries.filter(id => id !== countryId);
      }
    }
    
    console.log("BaseBanknoteFilter: New countries:", newCountries);
    handleFilterChange({ countries: newCountries });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Sort change:", { sortId, checked });
    
    const sortOption = sortOptions.find(option => option.id === sortId);
    if (!sortOption || !sortOption.fieldName) return;
    
    const fieldName = sortOption.fieldName;
    
    // Define conflicting sort groups (only one can be selected from each group)
    const conflictingGroups = [
      ['priceHighToLow', 'priceLowToHigh'], // Price sorting - only one direction
      ['newest', 'oldest'], // Date sorting - only one direction
    ];
    
    const requiredSortFields = sortOptions
      .filter(option => option.isRequired)
      .map(option => option.fieldName)
      .filter(Boolean) as string[];
    
    let newSort: string[];
    
    if (checked) {
      // Remove conflicting sorts first
      newSort = selectedSort.filter(field => {
        // Find if current fieldName conflicts with any existing field
        const conflictGroup = conflictingGroups.find(group => group.includes(fieldName));
        if (conflictGroup) {
          // Remove other items from the same conflict group
          return !conflictGroup.includes(field) || field === fieldName;
        }
        return true;
      });
      
      // Add the new sort if not already present
      if (!newSort.includes(fieldName)) {
        newSort = [...newSort, fieldName];
      }
    } else {
      // Remove the unchecked sort option
      if (!requiredSortFields.includes(fieldName)) {
        newSort = selectedSort.filter(field => field !== fieldName);
      } else {
        newSort = [...selectedSort];
      }
    }
    
    // Ensure required fields are always included
    requiredSortFields.forEach(reqField => {
      if (!newSort.includes(reqField)) {
        newSort.push(reqField);
      }
    });
    
    console.log("BaseBanknoteFilter: New sort:", newSort);
    handleFilterChange({ sort: newSort });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("BaseBanknoteFilter: Search input change:", value);
    
    // Update local state immediately
    setSearch(value);
    
    // Cancel any pending debounced searches
    debouncedSearch.cancel();
    
    // Trigger search immediately for empty or single character
    if (value.length <= 1) {
      handleFilterChange({ search: value });
    } else {
      // Use debounced search for longer queries
      debouncedSearch(value);
    }
  };

  const toggleViewMode = () => {
    if (onViewModeChange) {
      const newMode = localViewMode === 'grid' ? 'list' : 'grid';
      console.log('BaseBanknoteFilter: Toggling view mode from', localViewMode, 'to', newMode);
      
      // Force immediate local state update
      setLocalViewMode(newMode);
      
      // Call parent callback immediately
      onViewModeChange(newMode);
      
      // Dispatch custom event for view mode change
      window.dispatchEvent(new CustomEvent('viewModeChange', { 
        detail: { mode: newMode } 
      }));
    }
  };

  const toggleGroupMode = () => {
    if (onGroupModeChange) {
      const newGroupMode = !localGroupMode;
      console.log('BaseBanknoteFilter: Toggling group mode from', localGroupMode, 'to', newGroupMode);
      
      // Force immediate local state update
      setLocalGroupMode(newGroupMode);
      
      // Call parent callback immediately
      onGroupModeChange(newGroupMode);
      
      // Dispatch custom event for group mode change
      window.dispatchEvent(new CustomEvent('groupModeChange', { 
        detail: { mode: newGroupMode } 
      }));
    }
  };

  const applyFilters = () => {
    console.log("BaseBanknoteFilter: Applying all filters explicitly");
    handleFilterChange({
      search,
      categories: selectedCategories,
      types: selectedTypes,
      sort: selectedSort
    });
  };

  const handleSaveClick = () => {
    applyFilters();
    
    if (onSaveFilters) {
      console.log("BaseBanknoteFilter: Calling onSaveFilters");
      onSaveFilters();
    }
    
    setIsCategorySheetOpen(false);
    setIsSortSheetOpen(false);
  };

  const allCategoriesSelected = categories.length > 0 && 
    categories.every(category => selectedCategories.includes(category.id));
    
  const allTypesSelected = types.length > 0 && 
    types.every(type => selectedTypes.includes(type.id));
    
  const allCountriesSelected = countries.length > 0 && 
    countries.every(country => selectedCountries.includes(country.id));

  return (
    <div className={cn(
      "w-full space-y-1.5 sm:space-y-0",
      className
    )}>
      {/* New country header row */}
      {countryName && (
  <div className="flex items-center justify-center gap-2 mb-4 px-2 sm:px-4 text-sm sm:text-base">
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 sm:h-8 sm:w-8"
      onClick={() => navigate('/catalog')}
    >
      {direction === 'rtl' ? <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />}
    </Button>

    {/* Mobile title */}
    <h3 className="text-xl font-semibold border-primary block sm:hidden">
      <span>{countryName} {tWithFallback('country.catalogue', 'catalogue')}</span>
    </h3>

    {/* Desktop title */}
    <h3 className="text-xl font-semibold border-primary hidden sm:block">
      <span>{countryName}'s {tWithFallback('country.historicalBanknoteCatalogue', 'Historical Banknote Catalogue')}</span>
    </h3>
  </div>
)}

      {/* Content row */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 sm:justify-center">
        {/* Search bar and view/group buttons */}
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-1 sm:w-[300px]">
            <Search className={`absolute ${direction === 'rtl' ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4`} />
                    <Input
          placeholder={tWithFallback('search.placeholder', 'Search banknotes...')}
          value={search}
          onChange={handleSearchChange}
          className={`${direction === 'rtl' ? 'pr-10' : 'pl-10'}`}
        />
          </div>

          {/* View and Group buttons */}
          <div className="flex gap-2">
            {onViewModeChange && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleViewMode}
                disabled={isLoading}
                title={localViewMode === 'grid' ? tWithFallback('viewMode.switchToList', 'Switch to list view') : tWithFallback('viewMode.switchToGrid', 'Switch to grid view')}
                className="touch-manipulation active:scale-95 transition-transform"
              >
                {localViewMode === 'grid' ? (
                  <LayoutList className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {onGroupModeChange && (
              <Button
                variant={localGroupMode ? "default" : "outline"}
                size="icon"
                onClick={toggleGroupMode}
                disabled={isLoading}
                aria-label={`${tWithFallback('groupMode.toggleGroupMode', 'Group similar banknotes')} ${localGroupMode ? tWithFallback('groupMode.toggleOff', 'off') : tWithFallback('groupMode.toggleOn', 'on')}`}
                title={tWithFallback('groupMode.toggleGroupMode', 'Group similar banknotes')}
                className="touch-manipulation active:scale-95 transition-transform"
              >
                <Layers className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Filter and Sort buttons */}
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <Filter className="h-4 w-4" />
                <span>{tWithFallback('filters.title', 'Filter')}</span>
              </Button>
            </SheetTrigger>
            
            <SheetContent side={isMobile ? "bottom" : "left"} className="w-full sm:max-w-lg overflow-y-auto max-h-screen">
              <SheetHeader>
                <SheetTitle><span>{tWithFallback('filters.title', 'Filters')}</span></SheetTitle>
              </SheetHeader>
              <div className="space-y-6 py-4 overflow-y-auto">
                {/* Countries Section - only show if countries are available */}
                {countries.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3"><span>{tWithFallback('categories.countries', 'Countries')}</span></h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-countries"
                          checked={allCountriesSelected}
                          onCheckedChange={(checked) => handleCountryChange("all", !!checked)}
                        />
                        <label htmlFor="all-countries" className="text-sm">{tWithFallback('categories.allCountries', 'All Countries')}</label>
                      </div>
                      {countries.map(country => (
                        <div key={country.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`country-${country.id}`}
                            checked={selectedCountries.includes(country.id)}
                            onCheckedChange={(checked) => handleCountryChange(country.id, !!checked)}
                          />
                          <label htmlFor={`country-${country.id}`} className="text-sm flex justify-between w-full">
                            <span>{withHighlight(country.name, search)}</span>
                            {country.count !== undefined && (
                              <span className="text-muted-foreground">({country.count})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                <h4 className="font-medium mb-3"><span>{tWithFallback('categories.title', 'Categories')}</span></h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-categories"
                        checked={allCategoriesSelected}
                        onCheckedChange={(checked) => handleCategoryChange("all", !!checked)}
                      />
                      <label htmlFor="all-categories" className="text-sm">{tWithFallback('categories.allCategories', 'All Categories')}</label>
                    </div>
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => handleCategoryChange(category.id, !!checked)}
                        />
                        <label htmlFor={`category-${category.id}`} className="text-sm flex justify-between w-full">
                          <span>{withHighlight(category.name, search)}</span>
                          {category.count !== undefined && (
                            <span className="text-muted-foreground">({category.count})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                              <div>
                <h4 className="font-medium mb-3"><span>{tWithFallback('categories.types', 'Types')}</span></h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="all-types"
                        checked={allTypesSelected}
                        onCheckedChange={(checked) => handleTypeChange("all", !!checked)}
                      />
                      <label htmlFor="all-types" className="text-sm">{tWithFallback('categories.allTypes', 'All Types')}</label>
                    </div>
                    {types.map(type => (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type.id}`}
                          checked={selectedTypes.includes(type.id)}
                          onCheckedChange={(checked) => handleTypeChange(type.id, !!checked)}
                        />
                        <label htmlFor={`type-${type.id}`} className="text-sm flex justify-between w-full">
                          <span>{withHighlight(type.name, search)}</span>
                          {type.count !== undefined && (
                            <span className="text-muted-foreground">({type.count})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                
                <SheetClose asChild>
                  <Button 
                    className="w-full"
                    onClick={() => setIsCategorySheetOpen(false)}
                  >
                    {tWithFallback('actions.close', 'Close')}
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>{tWithFallback('sort.title', 'Sort')}</span>
              </Button>
            </SheetTrigger>
            
            <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle> <span>{tWithFallback('sort.sortOptions', 'Sort Options')}</span> </SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-2">
                {sortOptions.map(option => {
                  const isFieldChecked = selectedSort.includes(option.fieldName || "");
                  return (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sort-${option.id}`}
                        checked={isFieldChecked}
                        disabled={option.isRequired}
                        onCheckedChange={(checked) => handleSortChange(option.id, !!checked)}
                      />
                      <label 
                        htmlFor={`sort-${option.id}`} 
                        className={cn(
                          "text-sm",
                          option.isRequired && "opacity-50"
                        )}
                      >
                        {option.name} {option.isRequired && `(${tWithFallback('sort.always', 'Always')})`}
                      </label>
                    </div>
                  );
                })}
                <SheetClose asChild className="mt-4">
                  <Button 
                    className="w-full mt-4"
                    onClick={() => setIsSortSheetOpen(false)}
                  >
                    {tWithFallback('actions.close', 'Close')}
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};
