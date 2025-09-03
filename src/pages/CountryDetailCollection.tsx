import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DynamicFilterState } from "@/types/filter";
import { CountryHeader } from "@/components/country/CountryHeader";
import { CountryFilterSection } from "@/components/country/CountryFilterSection";
import { useCountryData } from "@/hooks/use-country-data";
import { useCollectionItemsFetching } from "@/hooks/use-collection-items-fetching";
import { useBanknoteSorting } from "@/hooks/use-banknote-sorting";
import { useBanknoteGroups } from "@/hooks/use-banknote-groups";
import { getSultanOrderMap } from "@/services/sultanOrderService";
import { useAuth } from "@/context/AuthContext";
import { CollectionItemsDisplay } from "@/components/country/CollectionItemsDisplay";
import CountryDetailMissingItems from "@/pages/CountryDetailMissingItems";
import { FilterOption } from "@/components/filter/BaseBanknoteFilterProfile";
import { useCountryCategoryDefs } from "@/hooks/useCountryCategoryDefs";
import { useCountryTypeDefs } from "@/hooks/useCountryTypeDefs";
import BanknoteDetailCardWishList from '@/components/banknotes/BanknoteDetailCardWishList';
import { BanknoteFilterCollection } from '@/components/filter/BanknoteFilterCollection';
import { useCollectionData } from '@/hooks/use-collection-data';
import { cn } from "@/lib/utils";
import { statisticsService } from "@/services/statisticsService";
import { CollectionItem } from "@/types";
import { useScrollRestoration } from '@/hooks/use-scroll-restoration';
import { Button } from "@/components/ui/button";

interface CountryDetailCollectionProps {
  userId?: string;  // Optional user ID prop for viewing other users' collections
  countryName?: string; // Optional country name prop when not using URL params
  profileView?: boolean; // New prop to indicate if we're in profile view
  onBackToCountries?: () => void; // Make this optional
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
  const [sultanOrderMap, setSultanOrderMap] = useState<Map<string, number>>(new Map());
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  
  // Define effectiveCountryName first
  const effectiveCountryName = countryName || (country ? decodeURIComponent(country) : "");
  
  // Determine if current user is owner of the collection
  const isOwner = !userId || (user && userId === user.id);
  const effectiveUserId = userId || user?.id;

  const {
    countryId,
    countryData,
    categoryOrder,
    currencies,
    loading: countryLoading,
    groupMode,
    handleGroupModeChange
  } = useCountryData({ 
    countryName: effectiveCountryName, 
    navigate 
  });

  // Enhanced scroll restoration for collections
  const containerRef = useScrollRestoration(countryId || '', countryLoading, false);
  
  // Debug state for scroll restoration
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Function to collect debug logs from scroll restoration
  const collectDebugLogs = useCallback(() => {
    if (containerRef.current) {
      const scrollLogs = (containerRef.current as any).getScrollRestorationLogs?.() || [];
      const lazyLogs = (containerRef.current as any).getLazyCollectionDebugLogs?.() || [];
      setDebugLogs([...scrollLogs, ...lazyLogs]);
    }
  }, [containerRef]);

  // Toggle debug panel
  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
    if (!showDebugPanel) {
      collectDebugLogs();
    }
  }, [showDebugPanel, collectDebugLogs]);

  // Refresh debug logs
  const refreshDebugLogs = useCallback(() => {
    collectDebugLogs();
  }, [collectDebugLogs]);
  
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
    
    // Navigate to profile with country in URL if we're in profile view
    if (profileView && userId) {
      const encodedCountryName = encodeURIComponent(effectiveCountryName);
      navigate(`/profile/${userId}/${encodedCountryName}`);
    } else {
    navigate(`/profile/${userId || user?.id}`);
    }
  }, [effectiveCountryName, countryId, userId, user?.id, navigate, profileView]);

  // Fetch sultan order map when country changes
  useEffect(() => {
    if (countryId) {
      getSultanOrderMap(countryId).then(setSultanOrderMap).catch(() => setSultanOrderMap(new Map()));
    }
  }, [countryId]);
  
  const [filters, setFilters] = useState<DynamicFilterState>({
    search: "",
    categories: [],
    types: [],
    sort: [],
  });
  const [activeTab, setActiveTab] = useState<'collection' | 'wishlist' | 'missing' | 'sale'>('collection');
  // Use the new optimized collection data hook
  const {
    collectionItems,
    allBanknotes,
    wishlistItems,
    missingBanknotes,
    loading: collectionDataLoading,
    error: collectionDataError,
    refresh
  } = useCollectionData({
    countryId: countryId || '',
    userId: effectiveUserId || '',
    countryName: effectiveCountryName,
    filters,
    skipInitialFetch: false // Changed from !preferencesLoaded to false to prevent flash
  });
  
  // Show loading indicator after a short delay to prevent flashing
  useEffect(() => {
    const isLoading = countryLoading || collectionDataLoading;
    if (isLoading && !showLoadingIndicator) {
      const timer = setTimeout(() => {
        setShowLoadingIndicator(true);
      }, 300); // Show loading indicator after 300ms of loading
      
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setShowLoadingIndicator(false);
    }
  }, [countryLoading, collectionDataLoading, showLoadingIndicator]);
  
  // Determine when the component is fully loaded
  useEffect(() => {
    const isLoaded = !countryLoading && !collectionDataLoading && countryId && effectiveCountryName;
    if (isLoaded && !isFullyLoaded) {
      // Small delay to ensure all content is rendered
      const timer = setTimeout(() => {
        setIsFullyLoaded(true);
        console.log('[CountryDetailCollection] Component fully loaded');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [countryLoading, collectionDataLoading, countryId, effectiveCountryName, isFullyLoaded]);

  // Track collection view when page is loaded
  useEffect(() => {
    if (countryId && effectiveUserId && isFullyLoaded) {
      // Track the collection view
      statisticsService.trackCollectionView(effectiveUserId, countryId, user?.id);
    }
  }, [countryId, effectiveUserId, user?.id, isFullyLoaded]);
  


  // Add hooks for categories and types
  const { categories: categoryDefs, loading: categoriesLoading } = useCountryCategoryDefs(effectiveCountryName);
  const { types: typeDefs, loading: typesLoading } = useCountryTypeDefs(effectiveCountryName);

  // Use the collection items from the optimized hook
  const finalCollectionItems = collectionItems;

  // Filter collection items before sorting/grouping
  const filteredCollectionItems = useMemo(() => {


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



    const filtered = finalCollectionItems.filter(item => {
      if (!item.banknote) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches =
          (item.banknote.denomination && item.banknote.denomination.toLowerCase().includes(searchLower)) ||
          (item.banknote.sultanName && item.banknote.sultanName.toLowerCase().includes(searchLower)) ||
          (item.banknote.extendedPickNumber && item.banknote.extendedPickNumber.toLowerCase().includes(searchLower)) ||
          (item.banknote.category && item.banknote.category.toLowerCase().includes(searchLower)) ||
          (item.banknote.type && item.banknote.type.toLowerCase().includes(searchLower));
        
        if (!matches) {
          console.log("[CollectionItems] Item filtered out by search:", {
            id: item.id,
            denomination: item.banknote.denomination,
            sultanName: item.banknote.sultanName,
            extendedPickNumber: item.banknote.extendedPickNumber,
            category: item.banknote.category,
            type: item.banknote.type
          });
          return false;
        }
      }

      // Categories filter - only apply if categories are selected and we have category mappings
      if (filters.categories && filters.categories.length > 0 && Object.keys(categoryNameToId).length > 0) {
        // Get the category ID for this item's category name
        const itemCategoryId = categoryNameToId[item.banknote.category];
        
        // If we have a category ID for this item, check if it matches the selected categories
        if (itemCategoryId) {
          const categoryMatch = filters.categories.includes(itemCategoryId);
          
          if (!categoryMatch) {
            console.log("[CollectionItems] Category mismatch:", {
              itemId: item.id,
              itemCategory: item.banknote.category,
              itemCategoryId,
              selectedCategories: filters.categories
            });
            return false;
          }
        }
        // If no category ID is found for this item, don't filter it out - show all items
        // This ensures that items with missing or unmapped categories are still displayed
      }



      // IMPORTANT NOTE- WHEN WE WILL TRY TO "BRING BACK" THE TYPES FILTER, BRING BACK THE CODE BELOW:

      // Types filter - only apply if types are selected and we have type mappings
      // if (filters.types && filters.types.length > 0 && Object.keys(typeNameToId).length > 0) {
      //   // Get the type ID for this item's type name
      //   const itemTypeId = typeNameToId[item.banknote.type];
        
      //   // If we have a type ID for this item, check if it matches the selected types
      //   if (itemTypeId) {
      //     const typeMatch = filters.types.includes(itemTypeId);
          
      //     if (!typeMatch) {
      //       console.log("[CollectionItems] Type mismatch:", {
      //         itemId: item.id,
      //         itemType: item.banknote.type,
      //         itemTypeId,
      //         selectedTypes: filters.types
      //       });
      //       return false;
      //     }
      //   }
      //   // If no type ID is found for this item, don't filter it out - show all items
      //   // This ensures that items with missing or unmapped types are still displayed
      // }

      return true;
    });

    

    return filtered;
  }, [finalCollectionItems, filters, categoryDefs, typeDefs]);

  // Separate sale items from regular collection items
  const filteredCollectionItemsForSale = useMemo(() => {
    return filteredCollectionItems.filter(item => item.isForSale === true);
  }, [filteredCollectionItems]);

  const filteredCollectionItemsRegular = useMemo(() => {
    return filteredCollectionItems.filter(item => item.isForSale !== true);
  }, [filteredCollectionItems]);

  console.log("[CollectionItems] After separating sale items:", {
    total: filteredCollectionItems.length,
    forSale: filteredCollectionItemsForSale.length,
    regular: filteredCollectionItemsRegular.length
  });

  // Map collection items to a format compatible with the sorting hook
  const collectionItemsForSorting = filteredCollectionItemsRegular.map(item => ({
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

  // Apply default 'extPick' sort for collection items when no sort is selected
  const collectionSortFields = filters.sort.length > 0 ? filters.sort : ['extPick'];
  const sortedCollectionItems = useBanknoteSorting({
    banknotes: collectionItemsForSorting,
    currencies,
    sortFields: collectionSortFields
  });

  // Transform the sorted detailed banknotes back to collection items using the stored collectionItemId
  const sortedCollectionItemsWithData = sortedCollectionItems.map(sortedBanknote => {
    // Use the direct reference to the collection item ID
    const originalItem = filteredCollectionItemsRegular.find(item => item.id === (sortedBanknote as any).collectionItemId);
    if (!originalItem) {
      console.error("Could not find original collection item for ID:", (sortedBanknote as any).collectionItemId);
      return null;
    }
    
    // Create a new item that preserves the sorted banknote's extendedPickNumber
    return {
      ...originalItem,
      banknote: {
        ...originalItem.banknote,
        // Preserve the extendedPickNumber from the sorted banknote
        extendedPickNumber: (sortedBanknote as any).extendedPickNumber || originalItem.banknote?.extendedPickNumber
      }
    };
  }).filter(Boolean) as any[]; // Filter out any null values

  console.log("[CollectionItems] After sorting transformation:", {
    sortedItems: sortedCollectionItems.length,
    transformedItems: sortedCollectionItemsWithData.length,
    originalRegular: filteredCollectionItemsRegular.length
  });

  const groupedItems = useBanknoteGroups(
    sortedCollectionItems, 
    collectionSortFields, 
    categoryOrder,
    countryId,
    sultanOrderMap
  );

  console.log("[CollectionItems] After grouping:", {
    groupedItems: groupedItems.length,
    totalItemsInGroups: groupedItems.reduce((sum, group) => sum + group.items.length, 0)
  });

  // Convert grouped banknotes to grouped collection items
  const groupedCollectionItems = groupedItems.map(group => {
    // Map each banknote in the group to its corresponding collection item using collectionItemId
    const collectionItemsInGroup = group.items.map(banknote => {
      const collectionItem = filteredCollectionItemsRegular.find(item => item.id === (banknote as any).collectionItemId);
      if (!collectionItem) {
        console.error("Could not find collection item for banknote with collectionItemId:", (banknote as any).collectionItemId);
      }
      return collectionItem;
    }).filter(Boolean) as any[];
    
    // Process sultan groups if they exist, also using collectionItemId
    const sultanGroups = group.sultanGroups?.map(sultanGroup => ({
      sultan: sultanGroup.sultan,
      items: sultanGroup.items.map(banknote => {
        const collectionItem = filteredCollectionItemsRegular.find(item => item.id === (banknote as any).collectionItemId);
        if (!collectionItem) {
          console.error("Could not find collection item for banknote with collectionItemId in sultan group:", (banknote as any).collectionItemId);
        }
        return collectionItem;
      }).filter(Boolean) as any[]
    }));

    return {
      category: group.category,
      category_ar: group.category_ar,
      category_tr: group.category_tr,
      items: collectionItemsInGroup,
      sultanGroups: sultanGroups
    };
  });

  console.log("[CollectionItems] Final grouped collection items:", {
    totalGroups: groupedCollectionItems.length,
    totalItems: groupedCollectionItems.reduce((sum, group) => sum + group.items.length, 0),
    itemsPerGroup: groupedCollectionItems.map(group => ({ category: group.category, count: group.items.length }))
  });

  // Sort and group sale items
  const saleItemsForSorting = filteredCollectionItemsForSale.map(item => ({
    ...item.banknote,
    collectionData: {
      id: item.id,
      condition: item.condition,
      purchaseDate: item.purchaseDate,
      isForSale: item.isForSale,
      salePrice: item.salePrice
    },
    collectionItemId: item.id
  }));

  // Apply default 'extPick' sort for sale items when no sort is selected
  const saleSortFields = filters.sort.length > 0 ? filters.sort : ['extPick'];
  const sortedSaleItems = useBanknoteSorting({
    banknotes: saleItemsForSorting,
    currencies,
    sortFields: saleSortFields
  });

  const sortedSaleItemsWithData = sortedSaleItems.map(sortedBanknote => {
    const originalItem = filteredCollectionItemsForSale.find(item => item.id === (sortedBanknote as any).collectionItemId);
    if (!originalItem) {
      console.error("Could not find original sale item for ID:", (sortedBanknote as any).collectionItemId);
      return null;
    }
    
    // Create a new item that preserves the sorted banknote's extendedPickNumber
    return {
      ...originalItem,
      banknote: {
        ...originalItem.banknote,
        // Preserve the extendedPickNumber from the sorted banknote
        extendedPickNumber: (sortedBanknote as any).extendedPickNumber || originalItem.banknote?.extendedPickNumber
      }
    };
  }).filter(Boolean) as any[];

  const groupedSaleItems = useBanknoteGroups(
    sortedSaleItems,
    saleSortFields,
    categoryOrder,
    countryId,
    sultanOrderMap
  );

  const groupedSaleCollectionItems = groupedSaleItems.map(group => {
    const collectionItemsInGroup = group.items.map(banknote => {
      const collectionItem = filteredCollectionItemsForSale.find(item => item.id === (banknote as any).collectionItemId);
      if (!collectionItem) {
        console.error("Could not find sale item for banknote with collectionItemId:", (banknote as any).collectionItemId);
      }
      return collectionItem;
    }).filter(Boolean) as any[];
    
    const sultanGroups = group.sultanGroups?.map(sultanGroup => ({
      sultan: sultanGroup.sultan,
      items: sultanGroup.items.map(banknote => {
        const collectionItem = filteredCollectionItemsForSale.find(item => item.id === (banknote as any).collectionItemId);
        if (!collectionItem) {
          console.error("Could not find sale item for banknote with collectionItemId in sultan group:", (banknote as any).collectionItemId);
        }
        return collectionItem;
      }).filter(Boolean) as any[]
    }));

    return {
      category: group.category,
      category_ar: group.category_ar,
      category_tr: group.category_tr,
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

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    console.log('CountryDetailCollection: handleViewModeChange called with mode:', mode);
    setViewMode(mode);
    console.log('CountryDetailCollection: viewMode state updated to:', mode);
  }, []);

  const isLoading = countryLoading || collectionDataLoading;

  const handlePreferencesLoaded = useCallback(() => {
    console.log('[CountryDetailCollection] Preferences loaded, setting preferencesLoaded to true');
    setPreferencesLoaded(true);
  }, []);

  // Debug logging for loading states
  console.log('[CountryDetailCollection] Loading states:', {
    countryLoading,
    collectionDataLoading,
    preferencesLoaded,
    isLoading,
    filters: {
      categories: filters.categories.length,
      types: filters.types.length,
      sort: filters.sort.length
    }
  });

  // Determine the return path - if we're in profile view, it should return to profile
  const returnPath = userId ? `/profile/${user?.username}` : '/collection';

  // Remove the old useEffect hooks that were fetching data individually
  // The useCollectionData hook now handles all data fetching in parallel

  // Use the missing banknotes from the optimized hook
  const finalMissingBanknotes = missingBanknotes;

  // 1. Map missing banknotes to CollectionItem structure
  const missingCollectionItems = finalMissingBanknotes.map(banknote => {
    // Get image URLs from the banknote
    const obverseImage = banknote.imageUrls?.[0] || '';
    const reverseImage = banknote.imageUrls?.[1] || '';

    const mappedItem = {
      ...banknote, // spread all fields to top level for grouping/sorting
      id: banknote.id,
      userId: '',
      banknoteId: banknote.id,
      banknote, // keep the full object for the card
      isForSale: false,
      is_unlisted_banknote: false,
      isMissing: true,
      // Ensure correct field names for sorting (map from database fields to expected fields)
      sultanName: banknote.sultanName || (banknote as any).sultan_name || '',
      denomination: banknote.denomination || (banknote as any).face_value || '',
      extendedPickNumber: banknote.extendedPickNumber || (banknote as any).extended_pick_number || '',
      // Add image fields with correct mapping
      obverseImage,
      reverseImage,
      obverse_image_watermarked: null,
      reverse_image_watermarked: null,
      obverse_image_thumbnail: obverseImage,
      reverse_image_thumbnail: reverseImage,
      hide_images: false,
      // Add other fields that might be needed
      condition: null,
      grade: null,
      grade_by: null,
      grade_condition_description: null,
      publicNote: null,
      privateNote: null,
      purchasePrice: null,
      purchaseDate: null,
      location: null,
      orderIndex: null,
      createdAt: banknote.createdAt,
      updatedAt: banknote.updatedAt
    };

    return mappedItem;
  });
  
  // Filter missingCollectionItems before sorting/grouping
  const filteredMissingCollectionItems = useMemo(() => {
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
        
        if (!matches) return false;
      }

      // Categories filter - only apply if categories are selected and we have category mappings
      if (filters.categories && filters.categories.length > 0 && Object.keys(categoryNameToId).length > 0) {
        // Get the category ID for this item's category name
        const itemCategoryId = categoryNameToId[item.category];
        
        if (!itemCategoryId) return false;

        const categoryMatch = filters.categories.includes(itemCategoryId);
        
        if (!categoryMatch) return false;
      }

      // Types filter - only apply if types are selected and we have type mappings
      if (filters.types && filters.types.length > 0 && Object.keys(typeNameToId).length > 0) {
        // Get the type ID for this item's type name
        const itemTypeId = typeNameToId[item.type];
        
        if (!itemTypeId) return false;

        const typeMatch = filters.types.includes(itemTypeId);
        
        if (!typeMatch) return false;
      }

      return true;
    });

    return filtered;
  }, [missingCollectionItems, filters, categoryDefs, typeDefs]);

  // 2. Use the same sorting and grouping hooks for missing items - ensure default sort is applied
  const missingSortFields = filters.sort.length > 0 ? filters.sort : ['extPick'];
  const sortedMissingItems = useBanknoteSorting({
    banknotes: filteredMissingCollectionItems,
    currencies,
    sortFields: missingSortFields
  });
  const groupedMissingItems = useBanknoteGroups(
    sortedMissingItems,
    missingSortFields,
    categoryOrder,
    countryId,
    sultanOrderMap
  );

  // Map wishlist items to collection-like structure (similar to missing items)
  const wishlistCollectionItems = useMemo(() => {
    return wishlistItems.map(item => {
      const banknote = item.detailed_banknotes;
      
      if (!banknote) {
        console.error("[WishlistItems] No banknote data found for item:", item);
        return null;
      }
      
      // Get image URLs from banknote data
      const obverseImage = banknote.imageUrls && banknote.imageUrls.length > 0 
        ? banknote.imageUrls[0] 
        : "/placeholder.svg";
      const reverseImage = banknote.imageUrls && banknote.imageUrls.length > 1 
        ? banknote.imageUrls[1] 
        : "/placeholder.svg";

      const mappedItem = {
        ...banknote, // spread all fields to top level for grouping/sorting
        id: item.id, // wishlist item id
        userId: '',
        banknoteId: banknote.id,
        banknote, // keep the full object for the card
        wishlistItemId: item.id,
        isForSale: false,
        is_unlisted_banknote: false,
        isWishlist: true,
        // Ensure correct field names for sorting (map from database fields to expected fields)
        sultanName: banknote.sultanName || (banknote as any).sultan_name || '',
        denomination: banknote.denomination || (banknote as any).face_value || '',
        extendedPickNumber: banknote.extendedPickNumber || (banknote as any).extended_pick_number || '',
        // Add image fields with correct mapping
        obverseImage,
        reverseImage,
        obverse_image_watermarked: null,
        reverse_image_watermarked: null,
        obverse_image_thumbnail: obverseImage,
        reverse_image_thumbnail: reverseImage,
        hide_images: false,
        // Add other fields that might be needed
        condition: null,
        grade: null,
        grade_by: null,
        grade_condition_description: null,
        publicNote: null,
        privateNote: null,
        purchasePrice: null,
        purchaseDate: null,
        location: null,
        orderIndex: null,
        createdAt: banknote.createdAt,
        updatedAt: banknote.updatedAt
      };
      
      return mappedItem;
    }).filter(Boolean);
  }, [wishlistItems]);

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

    const filtered = wishlistCollectionItems.filter(item => {

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

    return filtered;
  }, [wishlistCollectionItems, filters, categoryDefs, typeDefs]);

  // Sorting and grouping - ensure default sort is applied
  const wishlistSortFields = filters.sort.length > 0 ? filters.sort : ['extPick'];
  
  const sortedWishlistItems = useBanknoteSorting({
    banknotes: filteredWishlistCollectionItems,
    currencies,
    sortFields: wishlistSortFields
  });
  
  const groupedWishlistItems = useBanknoteGroups(
    sortedWishlistItems,
    wishlistSortFields,
    categoryOrder,
    countryId,
    sultanOrderMap
  );

  // Function to get items in the exact order they appear on the page
  const getRenderedItemsForExport = useCallback((activeTab: string) => {
    switch (activeTab) {
      case 'collection': {
        const flattenedItems: CollectionItem[] = [];
        
        // Process each group in order
        groupedCollectionItems.forEach(group => {
          if (group.sultanGroups && group.sultanGroups.length > 0) {
            // If there are sultan groups, add items from each sultan group in order
            group.sultanGroups.forEach(sultanGroup => {
              flattenedItems.push(...sultanGroup.items);
            });
          } else {
            // If no sultan groups, add items directly from the group
            flattenedItems.push(...group.items);
          }
        });
        
        return flattenedItems;
      }
        
      case 'sale': {
        const flattenedItems: CollectionItem[] = [];
        
        groupedSaleCollectionItems.forEach(group => {
          if (group.sultanGroups && group.sultanGroups.length > 0) {
            group.sultanGroups.forEach(sultanGroup => {
              flattenedItems.push(...sultanGroup.items);
            });
          } else {
            flattenedItems.push(...group.items);
          }
        });
        
        return flattenedItems;
      }
        
      case 'missing': {
        const flattenedItems: CollectionItem[] = [];
        
        groupedMissingItems.forEach(group => {
          if (group.sultanGroups && group.sultanGroups.length > 0) {
            group.sultanGroups.forEach(sultanGroup => {
              flattenedItems.push(...sultanGroup.items);
            });
          } else {
            flattenedItems.push(...group.items);
          }
        });
        
        return flattenedItems;
      }
        
      case 'wishlist': {
        const flattenedItems: CollectionItem[] = [];
        
        groupedWishlistItems.forEach(group => {
          if (group.sultanGroups && group.sultanGroups.length > 0) {
            group.sultanGroups.forEach(sultanGroup => {
              flattenedItems.push(...sultanGroup.items);
            });
          } else {
            flattenedItems.push(...group.items);
          }
        });
        
        return flattenedItems;
      }
        
      default:
        return [];
    }
  }, [groupedCollectionItems, groupedSaleCollectionItems, groupedMissingItems, groupedWishlistItems]);

  // On mount, restore tab from sessionStorage if available
  useEffect(() => {
    const savedTab = sessionStorage.getItem('countryDetailActiveTab');
    if (savedTab === 'collection' || savedTab === 'missing' || savedTab === 'wishlist' || savedTab === 'sale') {
      setActiveTab(savedTab);
    }
  }, []);

  // Handler to change tab and persist it
  const handleTabChange = (tab: 'collection' | 'missing' | 'wishlist' | 'sale') => {
    setActiveTab(tab);
    sessionStorage.setItem('countryDetailActiveTab', tab);
  };

  return (
    <div ref={containerRef} className={cn(
      "bg-card border rounded-lg p-1 sm:p-6 -mb-11 ",
       "w-[96%] sm:w-[92%] mx-auto"
    )}>
      
      <BanknoteFilterCollection
        countryId={countryId}
        countryName={effectiveCountryName}
        countryNameAr={countryData?.name_ar}
        countryNameTr={countryData?.name_tr}
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
        collectionItems={collectionItems}
        sortedCollectionItems={sortedCollectionItemsWithData}
        sortedSaleItems={sortedSaleItemsWithData}
        sortedMissingItems={sortedMissingItems}
        sortedWishlistItems={sortedWishlistItems}
        getFlattenedItemsForExport={getRenderedItemsForExport}
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
          activeTab={activeTab}
          countryName={effectiveCountryName}
          filters={filters}
        />
      )}
      {activeTab === 'missing' && (
        <CollectionItemsDisplay
          groups={groupedMissingItems}
          showSultanGroups={missingSortFields.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          isOwner={isOwner}
          activeTab={activeTab}
          countryName={effectiveCountryName}
          filters={filters}
        />
      )}
      {activeTab === 'wishlist' && (
        <CollectionItemsDisplay
          groups={groupedWishlistItems}
          showSultanGroups={wishlistSortFields.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={collectionDataLoading}
          groupMode={groupMode}
          isOwner={isOwner}
          activeTab={activeTab}
          countryName={effectiveCountryName}
          filters={filters}
          hasAnyItems={wishlistItems && wishlistItems.length > 0}
        />
      )}
      {activeTab === 'sale' && (
        <CollectionItemsDisplay
          groups={groupedSaleCollectionItems}
          showSultanGroups={filters.sort.includes('sultan')}
          viewMode={viewMode}
          countryId={countryId}
          isLoading={isLoading}
          groupMode={groupMode}
          isOwner={isOwner}
          activeTab={activeTab}
          countryName={effectiveCountryName}
          filters={filters}
          hasAnyItems={collectionItems && collectionItems.some(item => item.isForSale)}
        />
      )}

    </div>
  );
};


export default CountryDetailCollection;
