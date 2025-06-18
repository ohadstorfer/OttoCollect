import React, { useState, useEffect, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  LayoutList, 
  Save,
  Layers,
  ArrowLeft
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
import { AddUnlistedBanknoteDialog } from '@/components/collection/AddUnlistedBanknoteDialog';

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
  activeTab?: 'collection' | 'wishlist' | 'missing';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing') => void;
  isOwner?: boolean;
  userId?: string;
  countryName?: string;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  onBackToCountries?: () => void;
};

export const BaseBanknoteFilterProfile: React.FC<BaseBanknoteFilterProps> = ({
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
  activeTab: propActiveTab,
  onTabChange: propOnTabChange,
  isOwner,
  userId,
  countryName,
  profileUser,
  onBackToCountries
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  
  const [search, setSearch] = useState(currentFilters.search || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentFilters.types || []);
  const [selectedSort, setSelectedSort] = useState<string[]>(currentFilters.sort || []);
  
  const isLocalChange = useRef(false);
  const prevFiltersRef = useRef<DynamicFilterState | null>(null);

  const [internalActiveTab, setInternalActiveTab] = useState<'collection' | 'wishlist' | 'missing'>('collection');
  const activeTab = (typeof propActiveTab === 'string' ? propActiveTab : internalActiveTab) as 'collection' | 'wishlist' | 'missing';
  const onTabChange = propOnTabChange || setInternalActiveTab;

  const tabList: { key: 'collection' | 'wishlist' | 'missing'; label: string }[] = [
    { key: 'collection', label: 'Collection' },
    { key: 'wishlist', label: 'Wishlist' },
    { key: 'missing', label: 'Missing' },
  ];

  console.log("BaseBanknoteFilter: Render with props", { 
    categories: categories.length, 
    types: types.length, 
    sortOptions: sortOptions.length,
    currentFilters,
    localState: { search, selectedCategories, selectedTypes, selectedSort }
  });

  useEffect(() => {
    if (isLocalChange.current) {
      console.log("BaseBanknoteFilter: Skipping sync due to local changes being applied");
      return;
    }
    
    const currentFilterStr = JSON.stringify({
      search: currentFilters.search,
      categories: currentFilters.categories,
      types: currentFilters.types,
      sort: currentFilters.sort
    });
    
    const prevFiltersStr = prevFiltersRef.current ? JSON.stringify({
      search: prevFiltersRef.current.search,
      categories: prevFiltersRef.current.categories,
      types: prevFiltersRef.current.types,
      sort: prevFiltersRef.current.sort
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
  }, [currentFilters]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      console.log("BaseBanknoteFilter: Debounced search with value:", value);
      handleFilterChange({ search: value });
    }, 300),
    [onFilterChange]
  );

  const handleFilterChange = (changes: Partial<DynamicFilterState>) => {
    console.log("BaseBanknoteFilter: Local filter change:", changes);
    
    isLocalChange.current = true;
    
    if (changes.search !== undefined) setSearch(changes.search);
    if (changes.categories !== undefined) setSelectedCategories(changes.categories);
    if (changes.types !== undefined) setSelectedTypes(changes.types);
    if (changes.sort !== undefined) setSelectedSort(changes.sort);
    
    const newFilters = {
      search: changes.search !== undefined ? changes.search : search,
      categories: changes.categories !== undefined ? changes.categories : selectedCategories,
      types: changes.types !== undefined ? changes.types : selectedTypes,
      sort: changes.sort !== undefined ? changes.sort : selectedSort,
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

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Category change:", { categoryId, checked });
    
    let newCategories: string[];
    
    if (categoryId === "all") {
      newCategories = checked ? categories.map(c => c.id) : [];
    } else {
      newCategories = checked 
        ? [...selectedCategories, categoryId]
        : selectedCategories.filter(id => id !== categoryId);
    }
    
    console.log("BaseBanknoteFilter: New categories:", newCategories);
    handleFilterChange({ categories: newCategories });
  };

  const handleTypeChange = (typeId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Type change:", { typeId, checked });
    
    let newTypes: string[];
    
    if (typeId === "all") {
      newTypes = checked ? types.map(t => t.id) : [];
    } else {
      newTypes = checked
        ? [...selectedTypes, typeId]
        : selectedTypes.filter(id => id !== typeId);
    }
    
    console.log("BaseBanknoteFilter: New types:", newTypes);
    handleFilterChange({ types: newTypes });
  };

  const handleSortChange = (sortId: string, checked: boolean) => {
    console.log("BaseBanknoteFilter: Sort change:", { sortId, checked });
    
    const sortOption = sortOptions.find(option => option.id === sortId);
    if (!sortOption || !sortOption.fieldName) return;
    
    const fieldName = sortOption.fieldName;
    
    const requiredSortFields = sortOptions
      .filter(option => option.isRequired)
      .map(option => option.fieldName)
      .filter(Boolean) as string[];
    
    let newSort: string[];
    
    if (checked) {
      if (!selectedSort.includes(fieldName)) {
        newSort = [...selectedSort, fieldName];
      } else {
        newSort = [...selectedSort];
      }
    } else {
      if (!requiredSortFields.includes(fieldName)) {
        newSort = selectedSort.filter(field => field !== fieldName);
      } else {
        newSort = [...selectedSort];
      }
    }
    
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
    setSearch(value);
    debouncedSearch(value);
  };

  const toggleViewMode = () => {
    if (onViewModeChange) {
      const newMode = viewMode === 'grid' ? 'list' : 'grid';
      onViewModeChange(newMode);
    }
  };

  const toggleGroupMode = () => {
    if (onGroupModeChange) {
      onGroupModeChange(!groupMode);
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

  // Handler for after unlisted banknote is added
  const onAddUnlistedBanknote = () => {
    if (onSaveFilters) onSaveFilters();
  };

  return (
    <div className={cn(
      "w-full space-y-1.5 sm:space-y-0",
      className
    )}>
      <div className="w-full">
        {/* Profile Header Row */}
        {profileUser && (
          <div className="flex items-center justify-center w-full mb-4 px-2 sm:px-4 text-sm sm:text-base">
            <div className="flex items-center gap-1 sm:gap-2">
              {onBackToCountries && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2"
                  onClick={onBackToCountries}
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              {profileUser.avatarUrl ? (
                <img 
                  src={profileUser.avatarUrl} 
                  alt={profileUser.username}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {profileUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-medium min-w-0 shrink">{profileUser.username}</span>
              {!isMobile && profileUser.rank && (
                <Badge variant="user" rank={profileUser.rank} showIcon className="shrink-0 ml-1 sm:ml-2" />
              )}
            </div>
            
            {countryName && activeTab && (
              <div className="flex items-center min-w-0 shrink">
                <span className="text-muted-foreground px-1 sm:px-3">/</span>
                <span className="font-medium min-w-0 shrink">{countryName} {activeTab}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-0 gap-2">
          <div className="flex flex-row justify-center sm:justify-start gap-2 sm:mr-6 bg-[#e7e1db] rounded-lg p-1">
            {tabList.map(tab => (
              <button
                key={tab.key}
                className={cn(
                  'px-6 py-1 rounded-md transition-colors outline-none',
                  activeTab === tab.key
                    ? 'bg-white text-black font-semibold'
                    : 'bg-transparent text-[#857e77] font-medium hover:bg-[#e7e1db]',
                  'focus-visible:ring-2 focus-visible:ring-ottoman-400',
                  'text-sm sm:text-base'
                )}
                onClick={() => onTabChange(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
           
          </div>
          <div className="ml-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search"
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>

                {/* AddUnlistedBanknoteDialog button for owners */}
                {isOwner && (
                  <AddUnlistedBanknoteDialog
                    userId={userId || ''}
                    countryName={countryName || ''}
                    onCreated={onAddUnlistedBanknote}
                  />
                )}

                {onViewModeChange && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleViewMode}
                    aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                  >
                    {viewMode === 'grid' ? (
                      <LayoutList className="h-4 w-4" />
                    ) : (
                      <LayoutGrid className="h-4 w-4" />
                    )}
                  </Button>
                )}
                
                {onGroupModeChange && (
                  <Button
                    variant={groupMode ? "default" : "outline"}
                    size="icon"
                    onClick={toggleGroupMode}
                    aria-label={`Toggle group mode ${groupMode ? 'off' : 'on'}`}
                    title="Group similar banknotes"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                      {isLoading && <span className="animate-spin">⊚</span>}
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
                        <Button 
                          className="w-full"
                          onClick={() => setIsCategorySheetOpen(false)}
                        >
                          Close
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={isSortSheetOpen} onOpenChange={setIsSortSheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
                      disabled={isLoading}
                    >
                      <Filter className="h-4 w-4" />
                      <span>Sort</span>
                      {isLoading && <span className="animate-spin">⊚</span>}
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
                        <Button 
                          className="w-full mt-4"
                          onClick={() => setIsSortSheetOpen(false)}
                        >
                          Close
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
