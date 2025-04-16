import React, { useState, useEffect } from "react";
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
};

export const BaseBanknoteFilter: React.FC<BaseBanknoteFilterProps> = ({
  categories,
  types,
  sortOptions,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
}) => {
  const isMobile = useIsMobile();
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [search, setSearch] = useState(currentFilters.search || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentFilters.types || []);
  const [selectedSort, setSelectedSort] = useState<string[]>(currentFilters.sort || []);

  useEffect(() => {
    setSearch(currentFilters.search || "");
    setSelectedCategories(currentFilters.categories || []);
    setSelectedTypes(currentFilters.types || []);
    setSelectedSort(currentFilters.sort || []);
  }, [currentFilters]);

  const debouncedSearch = debounce((value: string) => {
    handleFilterChange({ search: value });
  }, 300);

  const handleFilterChange = (changes: Partial<DynamicFilterState>) => {
    const newFilters = {
      search: changes.search !== undefined ? changes.search : currentFilters.search,
      categories: changes.categories !== undefined ? changes.categories : currentFilters.categories,
      types: changes.types !== undefined ? changes.types : currentFilters.types,
      sort: changes.sort !== undefined ? changes.sort : currentFilters.sort,
      country_id: currentFilters.country_id
    };
    
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories: string[];
    if (categoryId === "all") {
      newCategories = checked ? categories.map(c => c.id) : [];
    } else {
      newCategories = checked 
        ? [...selectedCategories, categoryId]
        : selectedCategories.filter(id => id !== categoryId);
    }
    
    setSelectedCategories(newCategories);
    handleFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (typeId: string, checked: boolean) => {
    let newTypes: string[];
    if (typeId === "all") {
      newTypes = checked ? types.map(t => t.id) : [];
    } else {
      newTypes = checked
        ? [...selectedTypes, typeId]
        : selectedTypes.filter(id => id !== typeId);
    }
    
    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    const sortOption = sortOptions.find(option => option.id === sortId);
    if (!sortOption || !sortOption.fieldName) return;
    
    const fieldName = sortOption.fieldName;
    
    const requiredSortFields = sortOptions
      .filter(option => option.isRequired)
      .map(option => option.fieldName)
      .filter(Boolean) as string[];
    
    let newSort: string[];
    if (checked) {
      newSort = [...selectedSort.filter(field => !requiredSortFields.includes(field) && field !== fieldName), fieldName, ...requiredSortFields];
    } else {
      newSort = selectedSort.filter(field => field !== fieldName && !requiredSortFields.includes(field)).concat(requiredSortFields);
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
    categories.every(category => selectedCategories.includes(category.id));
    
  const allTypesSelected = types.length > 0 && 
    types.every(type => selectedTypes.includes(type.id));

  return (
    <div className={cn(
      "w-full space-y-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-4",
      "sticky top-[64px] md:top-[72px] inset-x-0",
      className
    )}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search banknotes..."
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
                <span>{isMobile ? "Types" : "Category & Types"}</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "left"} className="w-full sm:max-w-lg overflow-y-auto max-h-screen">
            <SheetHeader>
              <SheetTitle>Categories & Types</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4 overflow-y-auto">
              <div>
                <h4 className="font-medium mb-3">Categories</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-categories"
                      checked={allCategoriesSelected}
                      onCheckedChange={(checked) => handleCategoryChange("all", !!checked)}
                    />
                    <label htmlFor="all-categories" className="text-sm">All Categories</label>
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
                <h4 className="font-medium mb-3">Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="all-types"
                      checked={allTypesSelected}
                      onCheckedChange={(checked) => handleTypeChange("all", !!checked)}
                    />
                    <label htmlFor="all-types" className="text-sm">All Types</label>
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
                <Button className="w-full">
                  Apply Filters
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
                <span>Sort</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "right"} className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Sort Options</SheetTitle>
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
                      {option.name} {option.isRequired && "(Always)"}
                    </label>
                  </div>
                );
              })}
              <SheetClose asChild className="mt-4">
                <Button className="w-full">
                  Apply Sort
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
