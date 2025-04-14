
import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { BanknoteFilterState, BANKNOTE_TYPES, DEFAULT_SELECTED_TYPES, SORT_OPTIONS } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  const isMobile = useIsMobile();
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_SELECTED_TYPES);
  const [selectedSort, setSelectedSort] = useState<string[]>(defaultSort);

  // Handle search with debounce
  const debouncedSearch = debounce((value: string) => {
    handleFilterChange({ search: value });
  }, 300);

  const handleFilterChange = (changes: Partial<BanknoteFilterState>) => {
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
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

  const handleTypeChange = (type: string, checked: boolean) => {
    let newTypes: string[];
    if (type === "all") {
      newTypes = checked ? [...BANKNOTE_TYPES] : [];
    } else {
      newTypes = checked
        ? [...selectedTypes, type]
        : selectedTypes.filter(t => t !== type);
    }
    setSelectedTypes(newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    if (sortId === "extPick") return; // Don't allow changing extPick

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

  const allCategoriesSelected = selectedCategories.length === categories.length && categories.length > 0;
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
              onClick={() => setIsCategorySheetOpen(true)}
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{isMobile ? "Categories" : "Category & Types"}</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side={isMobile ? "bottom" : "left"} className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Categories & Types</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto">
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
                      <label htmlFor={`category-${category.id}`} className="text-sm">
                        {category.name} {category.count !== undefined && `(${category.count})`}
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
                      <label htmlFor={`type-${type}`} className="text-sm">{type}</label>
                    </div>
                  ))}
                </div>
              </div>
              <SheetClose asChild>
                <Button className="w-full">Apply Filters</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setIsSortSheetOpen(true)}
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
                <Button className="w-full">Apply Sort</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
