
import React, { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
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

export type FilterCategory = {
  id: string;
  name: string;
  count?: number;
};

export type BanknoteFilterProps = {
  categories: FilterCategory[];
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  isLoading?: boolean;
  className?: string;
  defaultSort?: string[];
  availableTypes?: FilterCategory[];
  currentFilters?: Partial<DynamicFilterState>;
};

const normalizeType = (type: string): string => {
  if (!type) return "";
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes("issued") || lowerType === "issue") return tWithFallback('types.issuedNotes', 'issued notes');
  if (lowerType.includes("specimen")) return tWithFallback('types.specimens', 'specimens');
  if (lowerType.includes("cancelled") || lowerType.includes("annule")) return tWithFallback('types.cancelledAnnule', 'cancelled & annule');
  if (lowerType.includes("trial")) return tWithFallback('types.trialNote', 'trial note');
  if (lowerType.includes("error")) return tWithFallback('types.errorBanknote', 'error banknote');
  if (lowerType.includes("counterfeit")) return tWithFallback('types.counterfeitBanknote', 'counterfeit banknote');
  if (lowerType.includes("emergency")) return tWithFallback('types.emergencyNote', 'emergency note');
  if (lowerType.includes("check") || lowerType.includes("bond")) return tWithFallback('types.checkBondNotes', 'check & bond notes');
  
  return lowerType;
};



export const BanknoteFilter: React.FC<BanknoteFilterProps> = ({
  categories,
  onFilterChange,
  isLoading = false,
  className,
  defaultSort = ["extPick"],
  availableTypes = [],
  currentFilters = {}
}) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation(['filter']);
  
  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);
  
  // Define sort options with translations
  const sortOptions = useMemo(() => [
    { id: "extPick", name: tWithFallback('sort.catalogNumber', 'Catalog Number'), required: true },
    { id: "sultan", name: tWithFallback('sort.sultan', 'Sultan') },
    { id: "faceValue", name: tWithFallback('sort.faceValue', 'Face Value') },
    { id: "newest", name: tWithFallback('sort.newestFirst', 'Newest First') }
  ], [tWithFallback]);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [search, setSearch] = useState(currentFilters.search || "");
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.categories || (categories.length > 0 ? categories.map(c => c.id) : [])
  );
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters.types || (availableTypes.length > 0 ? [tWithFallback('types.issuedNotes', 'issued notes') , tWithFallback('types.otherNotes', 'Other notes')] : [])
  );
  
  const [selectedSort, setSelectedSort] = useState<string[]>(
    currentFilters.sort || defaultSort
  );

  const debouncedSearch = debounce((value: string) => {
    handleFilterChange({ search: value });
  }, 300);

  useEffect(() => {
    handleFilterChange({
      search: search,
      categories: selectedCategories,
      types: selectedTypes,
      sort: selectedSort
    });
  }, []);

  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      const newCategories = categories.map(c => c.id);
      setSelectedCategories(newCategories);
      handleFilterChange({ categories: newCategories });
    }
    
    if (availableTypes.length > 0 && selectedTypes.length === 0) {
      const newTypes = [tWithFallback('types.issuedNotes', 'issued notes') , tWithFallback('types.otherNotes', 'Other notes')];
      setSelectedTypes(newTypes);
      handleFilterChange({ types: newTypes });
    }
  }, [categories, availableTypes]);

  const handleFilterChange = (changes: Partial<DynamicFilterState>) => {
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
    };
    
    onFilterChange(newFilters);
  };

  const caseInsensitiveIncludes = (array: string[], value: string): boolean => {
    if (value.includes('type') || value.includes('type.id')) {
      return array.some(item => normalizeType(item) === normalizeType(value));
    }
    return array.some(item => item.toLowerCase() === value.toLowerCase());
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories: string[];
    if (categoryId === "all") {
      // If "All Categories" is clicked and not all are currently selected, select all
      // If all are already selected, do nothing (don't clear all)
      if (allCategoriesSelected) {
        console.log("BanknoteFilter: All categories already selected, doing nothing");
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
          console.log("BanknoteFilter: Cannot remove last category, doing nothing");
          return;
        }
        newCategories = selectedCategories.filter(id => id !== categoryId);
      }
    }
    
    setSelectedCategories(newCategories);
    handleFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    let newTypes: string[];
    if (type === "all") {
      // If "All Types" is clicked and not all are currently selected, select all
      // If all are already selected, do nothing (don't clear all)
      if (allTypesSelected) {
        console.log("BanknoteFilter: All types already selected, doing nothing");
        return;
      } else {
        newTypes = availableTypes.map(t => t.id);
      }
    } else {
      if (checked) {
        // Adding a type
        newTypes = [...selectedTypes, type];
      } else {
        // Removing a type - prevent removing the last one
        if (selectedTypes.length <= 1) {
          console.log("BanknoteFilter: Cannot remove last type, doing nothing");
          return;
        }
        newTypes = selectedTypes.filter(t => normalizeType(t) !== normalizeType(type));
      }
    }
    
    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    if (sortId === "extPick") {
      return;
    }

    let newSort: string[];
    if (checked) {
      newSort = [...selectedSort.filter(s => s !== sortId && s !== "extPick"), sortId, "extPick"];
    } else {
      newSort = selectedSort.filter(s => s !== sortId && s !== "extPick").concat(["extPick"]);
    }
    
    setSelectedSort(newSort);
    handleFilterChange({ sort: newSort });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const allCategoriesSelected = categories.length > 0 && 
    categories.every(category => caseInsensitiveIncludes(selectedCategories, category.id));
    
  const allTypesSelected = availableTypes.length > 0 && 
    availableTypes.every(type => caseInsensitiveIncludes(selectedTypes, type.id));

  return (
    <div className={cn(
      "w-full space-y-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-4",
      "sticky top-0",
      className
    )}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={tWithFallback('search.placeholder', 'Search banknotes...')}
          value={search}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => {
                setIsCategorySheetOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{isMobile ? tWithFallback('categories.types', 'Types') : tWithFallback('categories.categoryAndTypes', 'Category & Types')}</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "left"} className="w-full sm:max-w-lg overflow-y-auto max-h-screen">
            <SheetHeader>
              <SheetTitle>{tWithFallback('categories.categoryAndTypes', 'Categories & Types')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4 overflow-y-auto">
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
                  {categories.map(category => {
                    const isChecked = caseInsensitiveIncludes(selectedCategories, category.id);
                    return (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleCategoryChange(category.id, !!checked)}
                        />
                        <label htmlFor={`category-${category.id}`} className="text-sm flex justify-between w-full">
                          <span>{withHighlight(category.name, search)}</span>
                          {category.count !== undefined && (
                            <span className="text-muted-foreground">({category.count})</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
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
                  {availableTypes.map(type => {
                    const isChecked = caseInsensitiveIncludes(selectedTypes, type.id);
                    return (
                      <div key={type.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleTypeChange(type.id, !!checked)}
                        />
                        <label htmlFor={`type-${type.id}`} className="text-sm flex justify-between w-full">
                          <span>{withHighlight(type.name, search)}</span>
                          {type.count !== undefined && (
                            <span className="text-muted-foreground">({type.count})</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <SheetClose asChild>
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Apply filters on close
                  }}
                >
                  {tWithFallback('filters.applyFilters', 'Apply Filters')}
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => {
                setIsSortSheetOpen(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{tWithFallback('sort.title', 'Sort')}</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{tWithFallback('sort.sortOptions', 'Sort Options')}</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-2">
              {sortOptions.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sort-${option.id}`}
                    checked={selectedSort.includes(option.id)}
                    disabled={option.required}
                    onCheckedChange={(checked) => handleSortChange(option.id, !!checked)}
                  />
                  <label 
                    htmlFor={`sort-${option.id}`} 
                    className={cn(
                      "text-sm",
                      option.required && "opacity-50"
                    )}
                  >
                    {option.name} {option.required && `(${tWithFallback('sort.always', 'Always')})`}
                  </label>
                </div>
              ))}
              <SheetClose asChild className="mt-4">
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Apply sort on close
                  }}
                >
                  {tWithFallback('sort.applySort', 'Apply Sort')}
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
