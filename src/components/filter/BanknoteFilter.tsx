
import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";
import { BANKNOTE_TYPES, DEFAULT_SELECTED_TYPES, SORT_OPTIONS } from "@/types";

export type FilterCategory = {
  id: string;
  name: string;
  count?: number;
};

export type BanknoteFilterProps = {
  categories: FilterCategory[];
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
  onFilterChange,
  isLoading = false,
  className,
}) => {
  const isMobile = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_SELECTED_TYPES);
  const [selectedSort, setSelectedSort] = useState<string[]>(["extPick"]);

  // Handle search with debounce
  const debouncedSearch = debounce((value: string) => {
    handleFilterChange({ search: value });
  }, 300);

  const handleFilterChange = (changes: Partial<{
    search: string;
    categories: string[];
    types: string[];
    sort: string[];
  }>) => {
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
    };
    onFilterChange(newFilters);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
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
      newSort = [...selectedSort.filter(s => s !== "extPick"), sortId, "extPick"];
    } else {
      newSort = selectedSort.filter(s => s !== sortId && s !== "extPick").concat(["extPick"]);
    }
    setSelectedSort(newSort);
    handleFilterChange({ sort: newSort });
  };

  const FilterDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Category & Type</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="p-2 space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2">Categories</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-categories"
                  checked={selectedCategories.length === categories.length}
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
            <Label className="text-sm font-medium mb-2">Types</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-types"
                  checked={selectedTypes.length === BANKNOTE_TYPES.length}
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SortDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Sort</span>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="p-2 space-y-2">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className={cn("w-full space-y-4", className)}>
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

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FilterDropdown />
        <SortDropdown />
      </div>
    </div>
  );
};
