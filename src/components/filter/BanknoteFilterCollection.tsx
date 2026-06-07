import React, { useState, useEffect, memo, useMemo } from "react";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import {
  fetchCategoriesByCountryId,
  fetchTypesByCountryId,
  fetchSortOptionsByCountryId
} from "@/services/countryService";
import { cn } from "@/lib/utils";
import { BaseBanknoteFilterProfile } from "./BaseBanknoteFilterProfile";
import { CollectionItem } from "@/types";
import { useTranslation } from "react-i18next";

export interface BanknoteFilterCollectionProps {
  countryId: string;
  countryName: string;
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  groupMode?: boolean;
  onGroupModeChange?: (mode: boolean) => void;
  onPreferencesLoaded?: () => void;
  activeTab?: 'collection' | 'wishlist' | 'missing' | 'sale';
  onTabChange?: (tab: 'collection' | 'wishlist' | 'missing' | 'sale') => void;
  isOwner?: boolean;
  profileUser?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
  onBackToCountries?: () => void;
  collectionItems?: CollectionItem[];
  sortedCollectionItems?: CollectionItem[];
  sortedSaleItems?: CollectionItem[];
  sortedMissingItems?: CollectionItem[];
  sortedWishlistItems?: CollectionItem[];
  currencies?: any[];
  categoryOrder?: any[];
  getFlattenedItemsForExport?: (activeTab: string) => CollectionItem[];
  countryNameAr?: string;
  countryNameTr?: string;
  preferencesLoaded?: boolean;
}

// Custom comparison function to ensure re-renders when viewMode or groupMode change
const areEqual = (prevProps: BanknoteFilterCollectionProps, nextProps: BanknoteFilterCollectionProps) => {
  // Always re-render if groupMode change
  if (prevProps.groupMode !== nextProps.groupMode) {

    return false;
  }

  // Re-render when the store's viewMode changes so the toggle UI stays in sync.
  if (prevProps.viewMode !== nextProps.viewMode) {
    return false;
  }

  // Re-render if other important props change
  if (prevProps.countryId !== nextProps.countryId ||
      prevProps.activeTab !== nextProps.activeTab ||
      prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }

  // Re-render when the filter selection changes. The parent derives
  // `currentFilters` via useMemo keyed on the store fields, so the reference only
  // changes when values actually change — a reference compare avoids stale
  // checkboxes after the store hydrates/updates without causing excess renders.
  if (prevProps.currentFilters !== nextProps.currentFilters) {
    return false;
  }

  return true;
};

// Use React.memo with custom comparison to ensure re-renders when viewMode or groupMode change
export const BanknoteFilterCollection: React.FC<BanknoteFilterCollectionProps> = memo(({
  countryId,
  countryName,
  countryNameAr,
  countryNameTr,
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  viewMode: viewModeFromStore,
  onViewModeChange,
  groupMode = false,
  onGroupModeChange,
  activeTab,
  onTabChange,
  isOwner = false,
  profileUser,
  onBackToCountries,
  collectionItems,
  sortedCollectionItems,
  sortedSaleItems,
  sortedMissingItems,
  sortedWishlistItems,
  currencies = [],
  categoryOrder = [],
  getFlattenedItemsForExport,
  preferencesLoaded: externalPreferencesLoaded = false
}) => {
  const { t } = useTranslation(['filter']);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // The shared filter store (driven by the parent) now owns preference
  // hydration. `preferencesLoaded` is the parent's `cf.hydrated` flag.
  const preferencesLoaded = externalPreferencesLoaded;

  // Fetch only the option DEFINITIONS (categories / types / sort options) needed
  // to render the filter checkboxes. The shared filter store now owns all
  // preference hydration and persistence, so this effect no longer reads or
  // writes prefs. Unlike the catalog, the collection includes ALL categories
  // (no "Unlisted Banknotes" exclusion). Synthetic faceValue / extPick sort
  // fallbacks are preserved so sorting always has the required fields available.
  useEffect(() => {
    if (!countryId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const [cats, typs, sorts] = await Promise.all([
        fetchCategoriesByCountryId(countryId),
        fetchTypesByCountryId(countryId),
        fetchSortOptionsByCountryId(countryId),
      ]);
      if (!alive) return;

      setCategories(cats.map((c: any) => ({ id: c.id, name: c.name, name_ar: c.name_ar, name_tr: c.name_tr })));
      setTypes(typs.map((t: any) => ({ id: t.id, name: t.name, name_ar: t.name_ar, name_tr: t.name_tr })));

      let hasFaceValueOption = false;
      let hasPickOption = false;
      const mappedSortOptions = sorts.map((s: any) => {
        if (s.field_name === "faceValue") hasFaceValueOption = true;
        if (s.field_name === "extPick") hasPickOption = true;
        return {
          id: s.id,
          name: s.name,
          name_ar: s.name_ar,
          name_tr: s.name_tr,
          fieldName: s.field_name,
          isRequired: s.is_required,
        };
      });

      if (!hasFaceValueOption) {
        mappedSortOptions.push({
          id: "facevalue-default",
          name: tWithFallback('sort.faceValue', 'Face Value'),
          name_ar: tWithFallback('sort.faceValue', 'Face Value'),
          name_tr: tWithFallback('sort.faceValue', 'Face Value'),
          fieldName: "faceValue",
          isRequired: false,
        });
      }

      if (!hasPickOption) {
        mappedSortOptions.push({
          id: "extpick-default",
          name: tWithFallback('sort.catalogNumber', 'Catalog Number'),
          name_ar: tWithFallback('sort.catalogNumber', 'Catalog Number'),
          name_tr: tWithFallback('sort.catalogNumber', 'Catalog Number'),
          fieldName: "extPick",
          isRequired: true,
        });
      }

      setSortOptions(mappedSortOptions);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [countryId]);

  // The shared store now owns prefs/persistence. These handlers only forward to
  // the parent (which writes the store). Local viewMode is kept so the toggle UI
  // reflects the current store value.
  const handleFilterChange = React.useCallback((newFilters: Partial<DynamicFilterState>) => {
    onFilterChange(newFilters);
  }, [onFilterChange]);

  const handleViewModeChange = React.useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const handleGroupModeChange = React.useCallback((mode: boolean) => {
    onGroupModeChange?.(mode);
  }, [onGroupModeChange]);

  // Keep the local view-mode toggle in sync with the store value (prop).
  useEffect(() => {
    if (viewModeFromStore && viewModeFromStore !== viewMode) setViewMode(viewModeFromStore);
  }, [viewModeFromStore]);

  return (
    <div className={cn(
      "w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-1.5",
      "sticky top-16 inset-x-0",
      className
    )}>
      <BaseBanknoteFilterProfile
        categories={categories}
        types={types}
        sortOptions={sortOptions}
        onFilterChange={handleFilterChange}
        currentFilters={currentFilters}
        isLoading={isLoading || loading}
        className={className}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        groupMode={groupMode}
        onGroupModeChange={handleGroupModeChange}
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOwner={isOwner}
        countryId={countryId}
        countryName={countryName}
        countryNameAr={countryNameAr}
        countryNameTr={countryNameTr}
        profileUser={profileUser}
        onBackToCountries={onBackToCountries}
        collectionItems={collectionItems}
        sortedCollectionItems={sortedCollectionItems}
        sortedSaleItems={sortedSaleItems}
        sortedMissingItems={sortedMissingItems}
        sortedWishlistItems={sortedWishlistItems}
        currencies={currencies}
        categoryOrder={categoryOrder}
        getFlattenedItemsForExport={getFlattenedItemsForExport}
        preferencesLoaded={preferencesLoaded}
      />
    </div>
  );
}, areEqual);

// Add a display name for the memoized component
BanknoteFilterCollection.displayName = 'BanknoteFilterCollection';
