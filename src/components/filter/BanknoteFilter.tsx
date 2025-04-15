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

const normalizeType = (type: string): string => {
  if (!type) return "";
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes("issued") || lowerType === "issue") return "issued notes";
  if (lowerType.includes("specimen")) return "specimens";
  if (lowerType.includes("cancelled") || lowerType.includes("annule")) return "cancelled & annule";
  if (lowerType.includes("trial")) return "trial note";
  if (lowerType.includes("error")) return "error banknote";
  if (lowerType.includes("counterfeit")) return "counterfeit banknote";
  if (lowerType.includes("emergency")) return "emergency note";
  if (lowerType.includes("check") || lowerType.includes("bond")) return "check & bond notes";
  
  return lowerType;
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
  
  const isMobile = useIsMobile();
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categories.length > 0 ? categories.map(c => c.id) : DEFAULT_SELECTED_CATEGORIES
  );
  
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    availableTypes.length > 0 ? ["issued notes"] : DEFAULT_SELECTED_TYPES
  );
  
  const [selectedSort, setSelectedSort] = useState<string[]>(defaultSort);

  console.log("Initial state:", { 
    search, 
    selectedCategories, 
    selectedTypes, 
    selectedSort 
  });

  const debouncedSearch = debounce((value: string) => {
    handleFilterChange({ search: value });
  }, 300);

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

  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      const newCategories = categories.map(c => c.id);
      setSelectedCategories(newCategories);
      handleFilterChange({ categories: newCategories });
    }
    
    if (availableTypes.length > 0 && selectedTypes.length === 0) {
      const newTypes = ["issued notes"];
      setSelectedTypes(newTypes);
      handleFilterChange({ types: newTypes });
    }
  }, [categories, availableTypes]);

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

  const caseInsensitiveIncludes = (array: string[], value: string): boolean => {
    if (value.includes('type') || value.includes('type.id')) {
      return array.some(item => normalizeType(item) === normalizeType(value));
    }
    return array.some(item => item.toLowerCase() === value.toLowerCase());
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    console.log(`Category change: ${categoryId} - ${checked ? "selected" : "deselected"}`);
    
    let newCategories: string[];
    if (categoryId === "all") {
      newCategories = checked ? categories.map(c => c.id) : [];
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
      newTypes = checked ? availableTypes.map(t => t.id) : [];
      console.log(`${checked ? "Selected" : "Deselected"} all types`);
    } else {
      newTypes = checked
        ? [...selectedTypes, type]
        : selectedTypes.filter(t => normalizeType(t) !== normalizeType(type));
    }
    
    console.log("New types:", newTypes);
    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    console.log(`Sort change: ${sortId} - ${checked ? "selected" : "deselected"}`);
    
    if (sortId === "extPick") {
      console.log("Sort extPick is required, ignoring change");
      return;
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
      "sticky top-[64px]",
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
