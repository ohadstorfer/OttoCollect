import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  ArrowLeft,
  ArrowUpDown,
  Printer,
  ArrowRight
} from "lucide-react";
import { BsFileEarmarkExcel } from "react-icons/bs";
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
import { usePrintCollection } from '@/hooks/usePrintCollection';
import { useTranslation } from 'react-i18next';
import { CollectionItem } from '@/types';
import { generateExcel, downloadExcel, generateFilename } from '@/services/csvExportService';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/context/LanguageContext";


export type FilterOption = {
  id: string;
  name: string;
  name_ar?: string;
  name_tr?: string;
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
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing' | 'sale') => void;
  isOwner?: boolean;
  userId?: string;
  countryName?: string;
  countryNameAr?: string;
  countryNameTr?: string;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
    role?: string;
  };
  onBackToCountries?: () => void;
  collectionItems?: CollectionItem[];
  sortedCollectionItems?: CollectionItem[];
  sortedSaleItems?: CollectionItem[];
  sortedMissingItems?: CollectionItem[];
  sortedWishlistItems?: CollectionItem[];
  onPrint?: () => void;
  currencies?: any[];
  categoryOrder?: any[];
  getFlattenedItemsForExport?: (activeTab: string) => CollectionItem[];
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
  countryNameAr,
  countryNameTr,
  profileUser,
  onBackToCountries,
  collectionItems,
  sortedCollectionItems,
  sortedSaleItems,
  sortedMissingItems,
  sortedWishlistItems,
  onPrint,
  currencies = [],
  categoryOrder = [],
  getFlattenedItemsForExport
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t: tFilter } = useTranslation(['filter']);
  const { t: tProfile } = useTranslation(['profile']);
  const { printCollection, isPrinting } = usePrintCollection();
  const { direction, currentLanguage } = useLanguage();
  
  // Function to get the appropriate country name based on current language
  const getTranslatedCountryName = () => {
    if (!countryName) return '';
    
    switch (currentLanguage) {
      case 'ar':
        return countryNameAr || countryName;
      case 'tr':
        return countryNameTr || countryName;
      default:
        return countryName;
    }
  };

  // Function to get the appropriate category name based on current language
  const getTranslatedCategoryName = (category: FilterOption) => {
    if (!category) return '';
    
    switch (currentLanguage) {
      case 'ar':
        return category.name_ar || category.name;
      case 'tr':
        return category.name_tr || category.name;
      default:
        return category.name;
    }
  };

  // Function to get the appropriate type name based on current language
  const getTranslatedTypeName = (type: FilterOption) => {
    if (!type) return '';
    
    switch (currentLanguage) {
      case 'ar':
        return type.name_ar || type.name;
      case 'tr':
        return type.name_tr || type.name;
      default:
        return type.name;
    }
  };

  // Function to get the appropriate sort option name based on current language
  const getTranslatedSortOptionName = (sortOption: FilterOption) => {
    if (!sortOption) return '';
    
    switch (currentLanguage) {
      case 'ar':
        return sortOption.name_ar || sortOption.name;
      case 'tr':
        return sortOption.name_tr || sortOption.name;
      default:
        return sortOption.name;
    }
  };

  const translatedCountryName = getTranslatedCountryName();
  
  // Function to get the translated tab label based on activeTab key
  const getTranslatedTabLabel = (tabKey: string) => {
    const tab = tabList.find(tab => tab.key === tabKey);
    return tab ? tab.label : tabKey;
  };
  // Separate states for desktop and mobile sheets
  const [isDesktopCategorySheetOpen, setIsDesktopCategorySheetOpen] = useState(false);
  const [isDesktopSortSheetOpen, setIsDesktopSortSheetOpen] = useState(false);
  const [isMobileCategorySheetOpen, setIsMobileCategorySheetOpen] = useState(false);
  const [isMobileSortSheetOpen, setIsMobileSortSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();


  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = tFilter(key);
      return translation === key ? fallback : translation;
    };
  }, [tFilter]);

  const [search, setSearch] = useState(currentFilters.search || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(currentFilters.types || []);
  const [selectedSort, setSelectedSort] = useState<string[]>(currentFilters.sort || []);

  // Local state for immediate UI updates
  const [localViewMode, setLocalViewMode] = useState(viewMode);
  const [localGroupMode, setLocalGroupMode] = useState(groupMode);

  const isLocalChange = useRef(false);
  const prevFiltersRef = useRef<DynamicFilterState | null>(null);

  const [internalActiveTab, setInternalActiveTab] = useState<'collection' | 'wishlist' | 'missing' | 'sale'>('collection');
  const activeTab = (typeof propActiveTab === 'string' ? propActiveTab : internalActiveTab) as 'collection' | 'wishlist' | 'missing' | 'sale';
  const onTabChange = propOnTabChange || setInternalActiveTab;

  const tabList: { key: 'collection' | 'wishlist' | 'missing' | 'sale'; label: string; }[] = [
    { key: 'collection', label: tProfile('tabs.collection', 'Collection') },
    { key: 'wishlist', label: tProfile('tabs.wishlist', 'Wishlist') },
    { key: 'missing', label: tProfile('tabs.missing', 'Missing') },
    { key: 'sale', label: tProfile('tabs.sale', 'Sale') },
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

  // Sync local state with props
  useEffect(() => {
    setLocalViewMode(viewMode);
    console.log("BaseBanknoteFilterProfile: viewMode prop changed to:", viewMode);
  }, [viewMode]);

  useEffect(() => {
    setLocalGroupMode(groupMode);
    console.log("BaseBanknoteFilterProfile: groupMode prop changed to:", groupMode);
  }, [groupMode]);

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
      console.log('BaseBanknoteFilterProfile: Toggling view mode from', localViewMode, 'to', newMode);

      // Force immediate local state update
      setLocalViewMode(newMode);

      // Call parent callback immediately
      onViewModeChange(newMode);

      // Dispatch custom event for view mode change
      window.dispatchEvent(new CustomEvent('viewModeChange', {
        detail: { mode: newMode }
      }));

      // Force a re-render by updating local state again if needed
      requestAnimationFrame(() => {
        if (localViewMode !== newMode) {
          setLocalViewMode(newMode);
        }
      });
    }
  };

  const toggleGroupMode = () => {
    if (onGroupModeChange) {
      const newGroupMode = !localGroupMode;
      console.log('BaseBanknoteFilterProfile: Toggling group mode from', localGroupMode, 'to', newGroupMode);

      // Force immediate local state update
      setLocalGroupMode(newGroupMode);

      // Call parent callback immediately
      onGroupModeChange(newGroupMode);

      // Dispatch custom event for group mode change
      window.dispatchEvent(new CustomEvent('groupModeChange', {
        detail: { mode: newGroupMode }
      }));

      // Force a re-render by updating local state again if needed
      requestAnimationFrame(() => {
        if (localGroupMode !== newGroupMode) {
          setLocalGroupMode(newGroupMode);
        }
      });
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

    // Close all sheets
    setIsDesktopCategorySheetOpen(false);
    setIsDesktopSortSheetOpen(false);
    setIsMobileCategorySheetOpen(false);
    setIsMobileSortSheetOpen(false);
  };

  const allCategoriesSelected = categories.length > 0 &&
    categories.every(category => selectedCategories.includes(category.id));

  const allTypesSelected = types.length > 0 &&
    types.every(type => selectedTypes.includes(type.id));

  // Handler for after unlisted banknote is added
  const onAddUnlistedBanknote = () => {
    if (onSaveFilters) onSaveFilters();
  };

  // Print handler
  const handlePrint = async () => {
    // Get the sorted items in the exact order they appear on the page
    const itemsToPrint: CollectionItem[] = getFlattenedItemsForExport
      ? getFlattenedItemsForExport(activeTab)
      : [];

    if (!itemsToPrint || itemsToPrint.length === 0 || !profileUser) {
      toast({
        title: "No data to print",
        description: "There are no items to print.",
        variant: "destructive"
      });
      return;
    }

    await printCollection(itemsToPrint, {
      username: profileUser.username,
      rank: profileUser.rank,
      role: profileUser.role
    }, countryName, activeTab);
  };

  // Excel Export handler
  const handleExportExcel = async () => {
    // Get the sorted items in the exact order they appear on the page
    const itemsToExport: CollectionItem[] = getFlattenedItemsForExport
      ? getFlattenedItemsForExport(activeTab)
      : [];

    if (!itemsToExport || itemsToExport.length === 0 || !profileUser) {
      toast({
        title: "No data to export",
        description: "There are no items to export.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const excelBuffer = await generateExcel({
        activeTab,
        userId: profileUser.id,
        countryName,
        collectionItems: collectionItems || [],
        sortedItems: itemsToExport
      });

      const filename = generateFilename(activeTab, profileUser.username, countryName);
      downloadExcel(excelBuffer, filename);

      toast({
        title: "Export successful",
        description: `${itemsToExport.length} items exported to Excel.`
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
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
                  {direction === 'rtl' ? <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" /> : <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
              )}
              {profileUser.avatarUrl ? (
                <img
                  src={profileUser.avatarUrl}
                  alt={profileUser.username}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-ottoman-600 to-ottoman-800 flex items-center justify-center text-parchment-100 text-sm sm:text-xl font-semibold uppercase">
                  {profileUser?.username?.charAt(0) || "?"}
                </div>
              )}
              <span className="font-medium min-w-0 shrink">{profileUser.username}</span>
              {!isMobile && profileUser.rank && (
                <Badge variant="user" rank={profileUser.rank} role={profileUser.role} showIcon className="shrink-0 ml-1 sm:ml-2" />
              )}
            </div>

            {translatedCountryName && activeTab && (
              <div className="flex items-center min-w-0 shrink">
                <span className="text-muted-foreground px-1 sm:px-3">/</span>
                <span className="font-medium min-w-0 shrink">{translatedCountryName} {getTranslatedTabLabel(activeTab)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 gap-2">
          {/* Tabs */}
          <div className="flex flex-row justify-center sm:justify-start gap-1 lg:gap-2 sm:mr-3 lg:mr-6 bg-[#e7e1db] rounded-lg p-1">
          {(direction === 'rtl' ? tabList.slice().reverse() : tabList).map(tab => (
              <button
                key={tab.key}
                className={cn(
                  'px-3 sm:px-1 md:px-2 lg:px-3 py-1 rounded-md transition-colors outline-none',
                  activeTab === tab.key
                    ? 'bg-white text-black font-semibold'
                    : 'bg-transparent text-[#857e77] font-medium hover:bg-[#e7e1db]',
                  'focus-visible:ring-2 focus-visible:ring-ottoman-400'
                )}
                onClick={() => onTabChange(tab.key)}
                type="button"
              >
                <span >{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Controls - Left aligned to the right of tabs */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Search bar */}
            <div className="relative max-w-auto [@media(min-width:1300px)]:ml-12">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
          placeholder={tWithFallback('search.placeholder', 'Search banknotes...')}
          value={search}
          onChange={handleSearchChange}
          className="pl-10"
        />
            </div>

                        {/* View and Group buttons */}
            {onViewModeChange && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleViewMode}
                disabled={isLoading}
                                      title={localViewMode === 'grid' ? tWithFallback('viewMode.switchToList', 'Switch to list view') : tWithFallback('viewMode.switchToGrid', 'Switch to grid view')}
                className="touch-manipulation active:scale-95 transition-transform h-9 w-9"
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
                className="touch-manipulation active:scale-95 transition-transform h-9 w-9"
              >
                <Layers className="h-4 w-4" />
              </Button>
            )}


            {/* Filter and Sort buttons */}
            <Sheet open={isDesktopCategorySheetOpen} onOpenChange={setIsDesktopCategorySheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center justify-center h-9 w-9 2xl:w-auto 2xl:px-3"
                  disabled={isLoading}
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden 2xl:inline ml-2">{tWithFallback('filters.title', 'Filter')}</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto max-h-screen">
                <SheetHeader>
                  <SheetTitle> <span> {tWithFallback('categories.title', 'Categories')}</span></SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-4 overflow-y-auto">
                  <div>
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
                            <span>{withHighlight(getTranslatedCategoryName(category), search)}</span>
                            {category.count !== undefined && (
                              <span className="text-muted-foreground">({category.count})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SheetClose asChild>
                    <Button
                      className="w-full"
                      onClick={() => setIsDesktopCategorySheetOpen(false)}
                    >
                      {tWithFallback('actions.close', 'Close')}
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={isDesktopSortSheetOpen} onOpenChange={setIsDesktopSortSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center justify-center h-9 w-9 2xl:w-auto 2xl:px-3"
                  disabled={isLoading}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span className="hidden 2xl:inline ml-2">{tWithFallback('sort.title', 'Sort')}</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-full sm:max-w-md">
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
                          {getTranslatedSortOptionName(option)} {option.isRequired && `(${tWithFallback('sort.always', 'Always')})`}
                        </label>
                      </div>
                    );
                  })}
                  <SheetClose asChild className="mt-4">
                    <Button
                      className="w-full mt-4"
                      onClick={() => setIsDesktopSortSheetOpen(false)}
                    >
                      {tWithFallback('actions.close', 'Close')}
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right-aligned buttons */}
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            

            {/* Print and Export buttons for collection owners */}
            {isOwner && collectionItems && collectionItems.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  title={tWithFallback('print.printCollection', 'Print Collection')}
                  className="touch-manipulation active:scale-95 transition-transform"
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  title={tWithFallback('export.exportToExcel', 'Export to Excel')}
                  className="touch-manipulation active:scale-95 transition-transform"
                >
                  <BsFileEarmarkExcel
                    className="h-4 w-4"
                    style={{
                      strokeWidth: '0.1px',
                      fill: 'currentColor',
                      fontWeight: 'bold',
                      filter: 'drop-shadow(0 0 0.3px currentColor)'
                    }}
                  />
                </Button>

 {/* AddUnlistedBanknoteDialog button for owners */}
                <AddUnlistedBanknoteDialog
                countryName={translatedCountryName || ''}
                onCreated={onAddUnlistedBanknote}
              />

              </>
            )}

          </div>

          {/* Mobile Layout - Keep original structure */}
          <div className="sm:hidden">
            <div className="flex flex-col sm:flex-row gap-1 lg:gap-2">
              <div className="flex gap-1 lg:gap-2 items-center">
                <div className="relative flex-1 ">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={tWithFallback('search.title', 'Search')}
                    value={search}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>

                {/* AddUnlistedBanknoteDialog button for owners */}
                {isOwner && (
                  <AddUnlistedBanknoteDialog
                    countryName={translatedCountryName || ''}
                    onCreated={onAddUnlistedBanknote}
                  />
                )}

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

                {/* Print and Export buttons for collection owners */}
                {isOwner && collectionItems && collectionItems.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrint}
                      disabled={isPrinting}
                      title={tWithFallback('print.printCollection', 'Print Collection')}
                      className="touch-manipulation active:scale-95 transition-transform"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      title={tWithFallback('export.exportToExcel', 'Export to Excel')}
                      className="touch-manipulation active:scale-95 transition-transform"
                    >
                      <BsFileEarmarkExcel 
                        className="h-4 w-4" 
                        style={{ 
                          strokeWidth: '0.1px', 
                          fill: 'currentColor',
                          fontWeight: 'bold',
                          filter: 'drop-shadow(0 0 0.3px currentColor)'
                        }} 
                      />
                    </Button>
                  </>
                )}
              </div>

              {/* Filter and Sort buttons on separate row for mobile */}
              <div className="flex gap-1 lg:gap-2">
                <Sheet open={isMobileCategorySheetOpen} onOpenChange={setIsMobileCategorySheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 lg:gap-2"
                      disabled={isLoading}
                    >
                      <Filter className="h-4 w-4 sm:hidden lg:block" />
                      <span>{tWithFallback('filters.title', 'Filter')}</span>
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent side="bottom" className="w-full sm:max-w-lg overflow-y-auto max-h-screen">
                    <SheetHeader>
                      <SheetTitle> <span>{tFilter('categories.title')}</span></SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 py-4 overflow-y-auto">
                      <div>
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
                                <span>{withHighlight(getTranslatedCategoryName(category), search)}</span>
                                {category.count !== undefined && (
                                  <span className="text-muted-foreground">({category.count})</span>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <SheetClose asChild>
                        <Button 
                          className="w-full"
                          onClick={() => setIsMobileCategorySheetOpen(false)}
                        >
                          {tWithFallback('actions.close', 'Close')}
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>

                <Sheet open={isMobileSortSheetOpen} onOpenChange={setIsMobileSortSheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-0 lg:gap-2"
                      disabled={isLoading}
                    >
                      <ArrowUpDown className="h-4 w-4 sm:hidden lg:block" />
                      <span>{tWithFallback('sort.title', 'Sort')}</span>
                    </Button>
                  </SheetTrigger>
                  
                  <SheetContent side="bottom" className="w-full sm:max-w-md">
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
                              {getTranslatedSortOptionName(option)} {option.isRequired && `(${tWithFallback('sort.always', 'Always')})`}
                            </label>
                          </div>
                        );
                      })}
                      <SheetClose asChild className="mt-4">
                        <Button 
                          className="w-full mt-4"
                          onClick={() => setIsMobileSortSheetOpen(false)}
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
        </div>
      </div>
    </div>
  );
};