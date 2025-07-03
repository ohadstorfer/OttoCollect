import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { useCountryData } from "@/hooks/use-country-data";
import { useCollectionItemsFetching } from "@/hooks/use-collection-items-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { useAuth } from "@/context/AuthContext";
import { CollectionItemsDisplay } from "@/components/country/CollectionItemsDisplay";
import CountryDetailMissingItems from "@/pages/CountryDetailMissingItems";
import { fetchUserCollectionByCountry } from '@/services/collectionService';
import { fetchBanknotesByCountryId } from '@/services/banknoteService';
import { FilterOption } from "@/components/filter/BaseBanknoteFilterProfile";
import { useCountryCategoryDefs } from "@/hooks/useCountryCategoryDefs";
import { useCountryTypeDefs } from "@/hooks/useCountryTypeDefs";
import { fetchUserWishlistByCountry } from '@/services/wishlistService';
import BanknoteDetailCardWishList from '@/components/banknotes/BanknoteDetailCardWishList';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import { cn } from "@/lib/utils";

interface CountryDetailCollectionProps {
  userId?: string;  // Optional user ID prop for viewing other users' collections
  countryName?: string; // Optional country name prop when not using URL params
  profileView?: boolean; // New prop to indicate if we're in profile view
  onBackToCountries: () => void;
  profileData?: {
    id: string;
    username: string;
    avatarUrl?: string;
    rank?: string;
  };
}

const CountryDetailCollection: React.FC<CountryDetailCollectionProps> = ({ 
  userId, 
  countryName,
  profileView = false,
  onBackToCountries,
  profileData
}) => {
  const { country } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Define effectiveCountryName first
  const effectiveCountryName = countryName || (country ? decodeURIComponent(country) : "");
  
  // Determine if current user is owner of the collection
  const isOwner = !userId || (user && userId === user.id);
  const effectiveUserId = userId || user?.id;

  const {
    countryId,
    categoryOrder,
    currencies,
    loading: countryLoading,
    groupMode,
    handleGroupModeChange
  } = useCountryData({ 
    countryName: effectiveCountryName, 
    navigate 
  });
  
  // Then use countryId in handleProfileNavigation after it's defined
  const handleProfileNavigation = useCallback(() => {
    if (effectiveCountryName && countryId) {
      // Store both country name and ID
      const countryData = {
        id: countryId,
        name: effectiveCountryName
      };
      sessionStorage.setItem('lastViewedCountry', JSON.stringify(countryData));
    }
    navigate(`/profile/${userId || user?.id}`);
  }, [effectiveCountryName, countryId, userId, user?.id, navigate]);
  
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: ["extPick"],
  });
  const [activeTab, setActiveTab] = useState<'collection' | 'missing' | 'wishlist'>('collection');
  const [userCollection, setUserCollection] = useState([]);
  const [allBanknotes, setAllBanknotes] = useState([]);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollY', window.scrollY.toString());
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add hooks for categories and types
  const { categories: categoryDefs, loading: categoriesLoading } = useCountryCategoryDefs(effectiveCountryName);
  const { types: typeDefs, loading: typesLoading } = useCountryTypeDefs(effectiveCountryName);

  // Use the collection items fetching hook with skipInitialFetch option
  const { collectionItems, loading: collectionItemsLoading } = useCollectionItemsFetching({
    countryId,
    filters,
    userId: effectiveUserId,
    skipInitialFetch: !preferencesLoaded
  });

  // Map collection items to a format compatible with the sorting hook
  const collectionItemsForSorting = collectionItems.map(item => ({
    ...item.banknote,
    collectionData: {
      id: item.id,
      condition: item.condition,
      purchaseDate: item.purchaseDate,
      isForSale: item.isForSale,
      salePrice: item.salePrice
    },
    // Add a reference to the original collection item ID
    collectionItemId: item.id
  }));

  const sortedCollectionItems = useBanknoteSorting({
    banknotes: collectionItemsForSorting,
    currencies,
    sortFields: filters.sort
  });

  // Transform the sorted detailed banknotes back to collection items using the stored collectionItemId
  const sortedCollectionItemsWithData = sortedCollectionItems.map(sortedBanknote => {
    // Use the direct reference to the collection item ID
    const originalItem = collectionItems.find(item => item.id === (sortedBanknote as any).collectionItemId);
    if (!originalItem) {
      console.error("Could not find original collection item for ID:", (sortedBanknote as any).collectionItemId);
      return null;
    }
    return originalItem;
  }).filter(Boolean) as any[]; // Filter out any null values

  const groupedItems = useBanknoteGroups(
    sortedCollectionItems, 
    filters.sort, 
    categoryOrder
  );

  // Convert grouped banknotes to grouped collection items
  const groupedCollectionItems = groupedItems.map(group => {
    // Map each banknote in the group to its corresponding collection item using collectionItemId
    const collectionItemsInGroup = group.items.map(banknote => {
      const collectionItem = collectionItems.find(item => item.id === (banknote as any).collectionItemId);
      if (!collectionItem) {
        console.error("Could not find collection item for banknote with collectionItemId:", (banknote as any).collectionItemId);
      }
      return collectionItem;
    }).filter(Boolean) as any[];
    
    // Process sultan groups if they exist, also using collectionItemId
    const sultanGroups = group.sultanGroups?.map(sultanGroup => ({
      sultan: sultanGroup.sultan,
      items: sultanGroup.items.map(banknote => {
        const collectionItem = collectionItems.find(item => item.id === (banknote as any).collectionItemId);
        if (!collectionItem) {
          console.error("Could not find collection item for banknote with collectionItemId in sultan group:", (banknote as any).collectionItemId);
        }
        return collectionItem;
      }).filter(Boolean) as any[]
    }));

    return {
      category: group.category,
      items: collectionItemsInGroup,
      sultanGroups: sultanGroups
    };
  });

  const handleFilterChange = useCallback((newFilters: Partial<DynamicFilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    // Mark preferences as loaded when filter changes come from BanknoteFilterCollection
    setPreferencesLoaded(true);
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  const isLoading = countryLoading || collectionItemsLoading;

  const handlePreferencesLoaded = useCallback(() => {
    setPreferencesLoaded(true);
  }, []);

  // Determine the return path - if we're in profile view, it should return to profile
  const returnPath = userId ? `/profile/${user?.username}` : '/collection';

  useEffect(() => {
    async function loadUserCollection() {
      if (countryId && effectiveUserId) {
        const items = await fetchUserCollectionByCountry(effectiveUserId, countryId);
        setUserCollection(items);
      } else {
        setUserCollection([]);
      }
    }
    loadUserCollection();
  }, [countryId, effectiveUserId]);

  useEffect(() => {
    async function loadAllBanknotes() {
      if (countryId) {
        const banknotes = await fetchBanknotesByCountryId(countryId);
        setAllBanknotes(banknotes);
      } else {
        setAllBanknotes([]);
      }
    }
    loadAllBanknotes();
  }, [countryId]);

  const missingBanknotes = useMemo(() => {
    if (!allBanknotes || !userCollection) return [];
    const userCountryCollection = userCollection.filter(
      item =>
        item.banknote &&
        item.banknote.country &&
        effectiveCountryName &&
        item.banknote.country.trim().toLowerCase() === effectiveCountryName.trim().toLowerCase()
    );
    const userBanknoteIds = new Set(userCountryCollection.map(item => String(item.banknoteId)));
    return allBanknotes.filter(banknote => !userBanknoteIds.has(String(banknote.id)));
  }, [allBanknotes, userCollection, effectiveCountryName]);

  // 1. Map missing banknotes to CollectionItem structure
  console.log("[MissingItems] Initial missingBanknotes:", missingBanknotes);
  const missingCollectionItems = missingBanknotes.map(banknote => ({
    ...banknote, // spread all fields to top level for grouping/sorting
    id: banknote.id,
    userId: '',
    banknoteId: banknote.id,
    banknote, // keep the full object for the card
    isForSale: false,
    is_unlisted_banknote: false,
    isMissing: true,
  }));
  console.log("[MissingItems] Mapped missingCollectionItems:", missingCollectionItems);
  console.log("[MissingItems] Current filters:", filters);

  // Filter missingCollectionItems before sorting/grouping
  const filteredMissingCollectionItems = useMemo(() => {
    console.log("[MissingItems] Starting filter with items:", missingCollectionItems.length);
    console.log("[MissingItems] Filter criteria:", {
      search: filters.search,
      categories: filters.categories,
      types: filters.types
    });

    // Create a map of category names to IDs
    const categoryNameToId = (categoryDefs || []).reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, string>);

    // Create a map of type names to IDs
    const typeNameToId = (typeDefs || []).reduce((acc, type) => {
      acc[type.name] = type.id;
      return acc;
    }, {} as Record<string, string>);

    console.log("[MissingItems] Category name to ID mapping:", categoryNameToId);
    console.log("[MissingItems] Type name to ID mapping:", typeNameToId);

    const filtered = missingCollectionItems.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches =
          (item.denomination && item.denomination.toLowerCase().includes(searchLower)) ||
          (item.sultanName && item.sultanName.toLowerCase().includes(searchLower)) ||
          (item.extendedPickNumber && item.extendedPickNumber.toLowerCase().includes(searchLower)) ||
          (item.category && item.category.toLowerCase().includes(searchLower)) ||
          (item.type && item.type.toLowerCase().includes(searchLower));
        
        if (!matches) {
          console.log("[MissingItems] Item filtered out by search:", {
            id: item.id,
            denomination: item.denomination,
            sultanName: item.sultanName,
            extendedPickNumber: item.extendedPickNumber,
            category: item.category,
            type: item.type
          });
          return false;
        }
      }

      // Categories filter - only apply if categories are selected and we have category mappings
      if (filters.categories && filters.categories.length > 0 && Object.keys(categoryNameToId).length > 0) {
        // Get the category ID for this item's category name
        const itemCategoryId = categoryNameToId[item.category];
        
        if (!itemCategoryId) {
          console.log("[MissingItems] No category ID found for category name:", {
            itemId: item.id,
            categoryName: item.category,
            availableCategories: Object.keys(categoryNameToId)
          });
          return false;
        }

        const categoryMatch = filters.categories.includes(itemCategoryId);
        
        if (!categoryMatch) {
          console.log("[MissingItems] Category mismatch:", {
            itemId: item.id,
            itemCategory: item.category,
            itemCategoryId,
            selectedCategories: filters.categories
          });
          return false;
        }
      }

      // Types filter - only apply if types are selected and we have type mappings
      if (filters.types && filters.types.length > 0 && Object.keys(typeNameToId).length > 0) {
        // Get the type ID for this item's type name
        const itemTypeId = typeNameToId[item.type];
        
        if (!itemTypeId) {
          console.log("[MissingItems] No type ID found for type name:", {
            itemId: item.id,
            typeName: item.type,
            availableTypes: Object.keys(typeNameToId)
          });
          return false;
        }

        const typeMatch = filters.types.includes(itemTypeId);
        
        if (!typeMatch) {
          console.log("[MissingItems] Type mismatch:", {
            itemId: item.id,
            itemType: item.type,
            itemTypeId,
            selectedTypes: filters.types
          });
          return false;
        }
      }

      return true;
    });

    console.log("[MissingItems] Filtered items count:", filtered.length);
    if (filtered.length === 0) {
      console.log("[MissingItems] Sample of items that were filtered out:", 
        missingCollectionItems.slice(0, 3).map(item => ({
          id: item.id,
          category: item.category,
          categoryId: categoryNameToId[item.category],
          type: item.type,
          typeId: typeNameToId[item.type],
          denomination: item.denomination
        }))
      );
    }

    return filtered;
  }, [missingCollectionItems, filters, categoryDefs, typeDefs]);

  // 2. Use the same sorting and grouping hooks for missing items
  const sortedMissingItems = useBanknoteSorting({
    banknotes: filteredMissingCollectionItems,
    currencies,
    sortFields: filters.sort
  });
  console.log("[MissingItems] Sorted missing items:", sortedMissingItems);
  const groupedMissingItems = useBanknoteGroups(
    sortedMissingItems,
    filters.sort,
    categoryOrder
  );
  console.log("[MissingItems] Grouped missing items:", groupedMissingItems);

  // Fetch wishlist items for the user and country
  useEffect(() => {
    async function loadWishlist() {
      if (countryId && effectiveUserId && effectiveCountryName) {
        setWishlistLoading(true);
        const items = await fetchUserWishlistByCountry(effectiveUserId, effectiveCountryName);
        setWishlistItems(items || []);
        setWishlistLoading(false);
      } else {
        setWishlistItems([]);
      }
    }
    loadWishlist();
  }, [countryId, effectiveUserId, effectiveCountryName]);

  // Map wishlist items to collection-like structure
  const wishlistCollectionItems = useMemo(() => wishlistItems.map(item => ({
    ...item.detailed_banknotes,
    id: item.id, // wishlist item id
    wishlistItemId: item.id,
    banknote: item.detailed_banknotes,
    isWishlist: true,
  })), [wishlistItems]);

  // Filtering logic (same as missing items)
  const filteredWishlistCollectionItems = useMemo(() => {
    // Create a map of category names to IDs
    const categoryNameToId = (categoryDefs || []).reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, string>);

    // Create a map of type names to IDs
    const typeNameToId = (typeDefs || []).reduce((acc, type) => {
      acc[type.name] = type.id;
      return acc;
    }, {} as Record<string, string>);

    return wishlistCollectionItems.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches =
          (item.denomination && item.denomination.toLowerCase().includes(searchLower)) ||
          (item.sultanName && item.sultanName.toLowerCase().includes(searchLower)) ||
          (item.extendedPickNumber && item.extendedPickNumber.toLowerCase().includes(searchLower)) ||
          (item.category && item.category.toLowerCase().includes(searchLower)) ||
          (item.type && item.type.toLowerCase().includes(searchLower));
        if (!matches) return false;
      }
      // Categories filter
      if (filters.categories && filters.categories.length > 0 && Object.keys(categoryNameToId).length > 0) {
        const itemCategoryId = categoryNameToId[item.category];
        if (!itemCategoryId) return false;
        if (!filters.categories.includes(itemCategoryId)) return false;
      }
      // Types filter
      if (filters.types && filters.types.length > 0 && Object.keys(typeNameToId).length > 0) {
        const itemTypeId = typeNameToId[item.type];
        if (!itemTypeId) return false;
        if (!filters.types.includes(itemTypeId)) return false;
      }
      return true;
    });
  }, [wishlistCollectionItems, filters, categoryDefs, typeDefs]);

  // Sorting and grouping
  const sortedWishlistItems = useBanknoteSorting({
    banknotes: filteredWishlistCollectionItems,
    currencies,
    sortFields: filters.sort
  });
  const groupedWishlistItems = useBanknoteGroups(
    sortedWishlistItems,
    filters.sort,
    categoryOrder
  );

  // On mount, restore tab from sessionStorage if available
  useEffect(() => {
    const savedTab = sessionStorage.getItem('countryDetailActiveTab');
    if (savedTab === 'collection' || savedTab === 'missing' || savedTab === 'wishlist') {
      setActiveTab(savedTab);
    }
  }, []);

  // Handler to change tab and persist it
  const handleTabChange = (tab: 'collection' | 'missing' | 'wishlist') => {
    setActiveTab(tab);
    sessionStorage.setItem('countryDetailActiveTab', tab);
  };

  return (
    <div className={cn(
      "bg-card border rounded-lg p-1 sm:p-6 mb-6",
       "w-[96%] sm:w-[92%] mx-auto"
    )}>
      
      <BanknoteFilterCollection
        countryId={countryId}
        countryName={effectiveCountryName}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        isLoading={isLoading}
        onViewModeChange={handleViewModeChange}
        groupMode={groupMode}
        onGroupModeChange={handleGroupModeChange}
        onPreferencesLoaded={handlePreferencesLoaded}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOwner={isOwner}
        profileUser={profileData}
        onBackToCountries={onBackToCountries}
      />

      {/* Conditionally render content based on activeTab */}
      {activeTab === 'collection' && (
        <CollectionItemsDisplay
          groups={groupedCollectionItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          isOwner={isOwner}
        />
      )}
      {activeTab === 'missing' && (
        <CollectionItemsDisplay
          groups={groupedMissingItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          isOwner={isOwner}
        />
      )}
      {activeTab === 'wishlist' && (
        <div className="mt-6">
          {wishlistLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
            </div>
          ) : groupedWishlistItems.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-xl font-medium mb-4">No wishlist items found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
              {groupedWishlistItems.flatMap(group =>
                group.items.map(item => (
                  <BanknoteDetailCardWishList
                    key={item.wishlistItemId || item.id}
                    banknote={item.banknote}
                    wishlistItemId={item.wishlistItemId}
                    source="catalog"
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export default CountryDetailCollection;
