import React, { useState, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import { Search, Filter, ChevronDown, ChevronUp, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

// Filter option types
export type FilterCategory = {
  id: string;
  name: string;
  count?: number;
};

export type FilterType = {
  id: string;
  name: string;
  count?: number;
};

export type SortOption = {
  id: string;
  name: string;
  disabled?: boolean;
  default?: boolean;
  required?: boolean;
};

export type BanknoteFilterProps = {
  categories: FilterCategory[];
  types: FilterType[];
  sortOptions: SortOption[];
  defaultSearch?: string;
  defaultCategories?: string[];
  defaultTypes?: string[];
  defaultSort?: string[];
  onFilterChange: (filters: {
    search: string;
    categories: string[];
    types: string[];
    sort: string[];
  }) => void;
  isLoading?: boolean;
  className?: string;
};

export const BanknoteFilter: React.FC<BanknoteFilterProps> = ({
  categories,
  types,
  sortOptions,
  defaultSearch = "",
  defaultCategories = [],
  defaultTypes = [],
  defaultSort = ["extPick"],
  onFilterChange,
  isLoading = false,
  className,
}) => {
  const isMobile = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [isTypeOpen, setIsTypeOpen] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState(defaultSearch);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    defaultCategories.length ? defaultCategories : []
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    defaultTypes.length ? defaultTypes : []
  );
  const [selectedSort, setSelectedSort] = useState<string[]>(defaultSort);
  
  // Check if "all" categories are selected
  const allCategoriesSelected = selectedCategories.length === categories.length || selectedCategories.length === 0;
  const allTypesSelected = selectedTypes.length === types.length || selectedTypes.length === 0;

  // Debounced search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      handleFilterChange({ search: value });
    }, 300),
    []
  );

  // Apply filters to parent component
  const handleFilterChange = useCallback(
    (changes: Partial<{ search: string; categories: string[]; types: string[]; sort: string[] }>) => {
      const newFilters = {
        search: changes.search !== undefined ? changes.search : search,
        categories: changes.categories !== undefined ? changes.categories : selectedCategories,
        types: changes.types !== undefined ? changes.types : selectedTypes,
        sort: changes.sort !== undefined ? changes.sort : selectedSort,
      };

      onFilterChange(newFilters);
    },
    [search, selectedCategories, selectedTypes, selectedSort, onFilterChange]
  );

  // Handle category selection
  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    let newCategories: string[];

    if (categoryId === "all") {
      // If "all" is selected, either select all or select none
      newCategories = checked ? categories.map(c => c.id) : [];
    } else {
      // If a specific category is selected
      if (checked) {
        newCategories = [...selectedCategories, categoryId];
      } else {
        newCategories = selectedCategories.filter(id => id !== categoryId);
      }
    }

    setSelectedCategories(newCategories);
    handleFilterChange({ categories: newCategories });
  };

  // Handle type selection
  const handleTypeChange = (typeId: string, checked: boolean) => {
    let newTypes: string[];

    if (typeId === "all") {
      // If "all" is selected, either select all or select none
      newTypes = checked ? types.map(t => t.id) : [];
    } else {
      // If a specific type is selected
      if (checked) {
        newTypes = [...selectedTypes, typeId];
      } else {
        newTypes = selectedTypes.filter(id => id !== typeId);
      }
    }

    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  // Handle sort selection
  const handleSortChange = (sortArray: string[]) => {
    // Always include required sort options
    const requiredOptions = sortOptions
      .filter(option => option.required)
      .map(option => option.id);
    
    const newSort = Array.from(new Set([...sortArray, ...requiredOptions]));
    
    setSelectedSort(newSort);
    handleFilterChange({ sort: newSort });
  };
  
  // Handle search input
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedTypes([]);
    // Keep only required sort options
    const requiredSort = sortOptions
      .filter(option => option.required)
      .map(option => option.id);
    setSelectedSort(requiredSort);
    
    handleFilterChange({
      search: "",
      categories: [],
      types: [],
      sort: requiredSort,
    });
  };

  // Mobile filter sheet
  const FilterSheet = () => (
    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="md:hidden flex items-center gap-2"
          onClick={() => setIsFilterOpen(true)}
        >
          <Filter size={16} />
          <span>Filters</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[350px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Banknotes</SheetTitle>
          <SheetDescription>
            Apply filters to find specific banknotes.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={resetFilters} 
            className="mb-4 text-destructive hover:text-destructive"
          >
            <X size={14} className="mr-1" />
            Reset All Filters
          </Button>
          
          {/* Mobile Categories Section */}
          <Collapsible
            open={isCategoryOpen}
            onOpenChange={setIsCategoryOpen}
            className="mb-4"
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center py-2 cursor-pointer border-b">
                <h3 className="text-lg font-medium">Categories</h3>
                {isCategoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="mobile-category-all"
                  checked={allCategoriesSelected}
                  onCheckedChange={(checked) => {
                    handleCategoryChange("all", Boolean(checked));
                  }}
                />
                <Label 
                  htmlFor="mobile-category-all"
                  className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Categories
                </Label>
              </div>
              
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`mobile-category-${category.id}`}
                    checked={selectedCategories.includes(category.id) || allCategoriesSelected}
                    onCheckedChange={(checked) => {
                      handleCategoryChange(category.id, Boolean(checked));
                    }}
                  />
                  <Label 
                    htmlFor={`mobile-category-${category.id}`}
                    className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category.name} {category.count !== undefined && `(${category.count})`}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
          
          {/* Mobile Types Section */}
          <Collapsible
            open={isTypeOpen}
            onOpenChange={setIsTypeOpen}
            className="mb-4"
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center py-2 cursor-pointer border-b">
                <h3 className="text-lg font-medium">Types</h3>
                {isTypeOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="mobile-type-all"
                  checked={allTypesSelected}
                  onCheckedChange={(checked) => {
                    handleTypeChange("all", Boolean(checked));
                  }}
                />
                <Label 
                  htmlFor="mobile-type-all"
                  className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Types
                </Label>
              </div>
              
              {types.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`mobile-type-${type.id}`}
                    checked={selectedTypes.includes(type.id) || allTypesSelected}
                    onCheckedChange={(checked) => {
                      handleTypeChange(type.id, Boolean(checked));
                    }}
                  />
                  <Label 
                    htmlFor={`mobile-type-${type.id}`}
                    className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.name} {type.count !== undefined && `(${type.count})`}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
          
          {/* Mobile Sort Section */}
          <Collapsible
            open={isSortOpen}
            onOpenChange={setIsSortOpen}
          >
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center py-2 cursor-pointer border-b">
                <h3 className="text-lg font-medium">Sort</h3>
                {isSortOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {sortOptions.map(sortOption => (
                <div key={sortOption.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`mobile-sort-${sortOption.id}`}
                    checked={selectedSort.includes(sortOption.id)}
                    disabled={sortOption.disabled || sortOption.required}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSortChange([...selectedSort, sortOption.id]);
                      } else {
                        handleSortChange(selectedSort.filter(id => id !== sortOption.id));
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`mobile-sort-${sortOption.id}`}
                    className={cn(
                      "text-sm font-medium",
                      sortOption.disabled || sortOption.required ? "opacity-70" : ""
                    )}
                  >
                    {sortOption.name} {sortOption.required && "(Always)"}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col md:grid md:grid-cols-[250px_1fr] gap-6">
        {/* Search & Mobile Filter Button */}
        <div className="w-full flex gap-2 md:col-span-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search banknotes..."
              value={search}
              onChange={handleSearchInputChange}
              className="pl-10"
            />
          </div>
          <FilterSheet />
        </div>
        
        {/* Desktop Filter Sidebar */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Filters</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters} 
              className="text-xs text-destructive hover:text-destructive"
            >
              <X size={14} className="mr-1" />
              Reset All
            </Button>
          </div>
          
          {/* Categories */}
          <div>
            <div className="flex justify-between items-center py-2">
              <h4 className="font-medium">Categories</h4>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="desktop-category-all"
                  checked={allCategoriesSelected}
                  onCheckedChange={(checked) => {
                    handleCategoryChange("all", Boolean(checked));
                  }}
                />
                <Label 
                  htmlFor="desktop-category-all"
                  className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Categories
                </Label>
              </div>
              
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`desktop-category-${category.id}`}
                    checked={selectedCategories.includes(category.id) || allCategoriesSelected}
                    onCheckedChange={(checked) => {
                      handleCategoryChange(category.id, Boolean(checked));
                    }}
                  />
                  <Label 
                    htmlFor={`desktop-category-${category.id}`}
                    className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {category.name} {category.count !== undefined && `(${category.count})`}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Types */}
          <div>
            <div className="flex justify-between items-center py-2">
              <h4 className="font-medium">Types</h4>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="desktop-type-all"
                  checked={allTypesSelected}
                  onCheckedChange={(checked) => {
                    handleTypeChange("all", Boolean(checked));
                  }}
                />
                <Label 
                  htmlFor="desktop-type-all"
                  className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Types
                </Label>
              </div>
              
              {types.map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`desktop-type-${type.id}`}
                    checked={selectedTypes.includes(type.id) || allTypesSelected}
                    onCheckedChange={(checked) => {
                      handleTypeChange(type.id, Boolean(checked));
                    }}
                  />
                  <Label 
                    htmlFor={`desktop-type-${type.id}`}
                    className="text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.name} {type.count !== undefined && `(${type.count})`}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sort */}
          <div>
            <div className="flex justify-between items-center py-2">
              <h4 className="font-medium">Sort</h4>
            </div>
            <div className="space-y-2 pt-2">
              {sortOptions.map(sortOption => (
                <div key={sortOption.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`desktop-sort-${sortOption.id}`}
                    checked={selectedSort.includes(sortOption.id)}
                    disabled={sortOption.disabled || sortOption.required}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleSortChange([...selectedSort, sortOption.id]);
                      } else {
                        handleSortChange(selectedSort.filter(id => id !== sortOption.id));
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`desktop-sort-${sortOption.id}`}
                    className={cn(
                      "text-sm font-medium",
                      sortOption.disabled || sortOption.required ? "opacity-70" : ""
                    )}
                  >
                    {sortOption.name} {sortOption.required && "(Always)"}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content placeholder - this will be provided by parent components */}
        <div className="md:col-span-1">
          {/* Parent component will render content here */}
        </div>
      </div>
    </div>
  );
};
