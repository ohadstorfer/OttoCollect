
import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { 
  BanknoteFilterState, 
  BANKNOTE_TYPES, 
  DEFAULT_SELECTED_TYPES,
  BANKNOTE_CATEGORIES,
  DEFAULT_SELECTED_CATEGORIES,
  SORT_OPTIONS 
} from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { withHighlight } from "./withHighlight";

export type FilterCategory = {
  id: string;
  name: string;
  count?: number;
};

export type BanknoteFilterProps = {
  categories: FilterCategory[];
  onFilterChange: (filters: BanknoteFilterState) => void;
  isLoading?: boolean;
  className?: string;
  defaultSort?: string[];
  availableTypes?: FilterCategory[];
};

export const BanknoteFilter: React.FC<BanknoteFilterProps> = ({
  categories,
  onFilterChange,
  isLoading = false,
  className,
  defaultSort = ["extPick"],
  availableTypes = []
}) => {
  console.log("### BanknoteFilter RENDERING ###");
  console.log("Props received:", { 
    categories: categories.length, 
    isLoading, 
    defaultSort, 
    availableTypes: availableTypes.length 
  });
  console.log("Categories:", categories);
  console.log("Available types:", availableTypes);
  
  const isMobile = useIsMobile();
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_SELECTED_CATEGORIES);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_SELECTED_TYPES);
  const [selectedSort, setSelectedSort] = useState<string[]>(defaultSort);

  console.log("Initial state:", { 
    search, 
    selectedCategories, 
    selectedTypes, 
    selectedSort 
  });

  // Handle search with debounce
  const debouncedSearch = debounce((value: string) => {
    console.log("Search debounced:", value);
    handleFilterChange({ search: value });
  }, 300);

  // Initial filter setup
  useEffect(() => {
    console.log("Initial filter setup in useEffect");
    console.log("Setting initial filters:", {
      search,
      categories: selectedCategories,
      types: selectedTypes,
      sort: selectedSort
    });
    
    handleFilterChange({
      search: search,
      categories: selectedCategories,
      types: selectedTypes,
      sort: selectedSort
    });
  }, []);

  const handleFilterChange = (changes: Partial<BanknoteFilterState>) => {
    console.log("Filter change requested:", changes);
    
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
    };
    
    console.log("New filters after merging:", newFilters);
    onFilterChange(newFilters);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    console.log(`Category change: ${categoryId} - ${checked ? "selected" : "deselected"}`);
    
    let newCategories: string[];
    if (categoryId === "all") {
      newCategories = checked ? BANKNOTE_CATEGORIES : [];
      console.log(`${checked ? "Selected" : "Deselected"} all categories`);
    } else {
      newCategories = checked 
        ? [...selectedCategories, categoryId]
        : selectedCategories.filter(id => id !== categoryId);
    }
    
    console.log("New categories:", newCategories);
    setSelectedCategories(newCategories);
    handleFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    console.log(`Type change: ${type} - ${checked ? "selected" : "deselected"}`);
    
    let newTypes: string[];
    if (type === "all") {
      newTypes = checked ? [...BANKNOTE_TYPES] : [];
      console.log(`${checked ? "Selected" : "Deselected"} all types`);
    } else {
      newTypes = checked
        ? [...selectedTypes, type]
        : selectedTypes.filter(t => t !== type);
    }
    
    console.log("New types:", newTypes);
    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    console.log(`Sort change: ${sortId} - ${checked ? "selected" : "deselected"}`);
    
    if (sortId === "extPick") {
      console.log("Sort extPick is required, ignoring change");
      return; // Don't allow changing extPick
    }

    let newSort: string[];
    if (checked) {
      newSort = [...selectedSort.filter(s => s !== sortId && s !== "extPick"), sortId, "extPick"];
    } else {
      newSort = selectedSort.filter(s => s !== sortId && s !== "extPick").concat(["extPick"]);
    }
    
    console.log("New sort:", newSort);
    setSelectedSort(newSort);
    handleFilterChange({ sort: newSort });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("Search input changed:", value);
    setSearch(value);
    debouncedSearch(value);
  };

  const allCategoriesSelected = selectedCategories.length === BANKNOTE_CATEGORIES.length && BANKNOTE_CATEGORIES.length > 0;
  const allTypesSelected = selectedTypes.length === BANKNOTE_TYPES.length;

  return (
    <div className={cn(
      "w-full space-y-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-4",
      "sticky top-[64px]", // Adjust this value based on your navbar height
      className
    )}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search banknotes..."
          value={search}
          onChange={handleSearchChange}
          className="pl-10"
        />
      </div>

      {/* Filter buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => {
                console.log("Category/Type filter button clicked");
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
                  {BANKNOTE_CATEGORIES.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
                      />
                      <label htmlFor={`category-${category}`} className="text-sm">
                        {withHighlight(category, search)}
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
                  {BANKNOTE_TYPES.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => handleTypeChange(type, !!checked)}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm">
                        {withHighlight(type, search)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <SheetClose asChild>
                <Button 
                  className="w-full"
                  onClick={() => {
                    console.log("Apply Filters button clicked");
                    console.log("Filters applied:", {
                      categories: selectedCategories,
                      types: selectedTypes
                    });
                  }}
                >
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
                console.log("Sort button clicked");
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
              {SORT_OPTIONS.map(option => (
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
                    {option.name} {option.required && "(Always)"}
                  </label>
                </div>
              ))}
              <SheetClose asChild className="mt-4">
                <Button 
                  className="w-full"
                  onClick={() => {
                    console.log("Apply Sort button clicked");
                    console.log("Sort applied:", selectedSort);
                  }}
                >
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
