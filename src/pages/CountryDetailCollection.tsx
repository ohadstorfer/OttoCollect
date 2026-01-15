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
    sultans,
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
  
  // Log category and type definitions for debugging
  React.useEffect(() => {
    if (categoryDefs && categoryDefs.length > 0) {
      console.log('🔍 [MissingItems] Category definitions loaded:', categoryDefs.map(cat => ({
        name: cat.name,
        id: cat.id,
        isWar1293: cat.name.includes('War 1293') || cat.name.includes('1293')
      })));
      const war1293Category = categoryDefs.find(cat => cat.name.includes('War 1293') || cat.name.includes('1293'));
      if (war1293Category) {
        console.log('🔍 [MissingItems] Found "War 1293" category definition:', war1293Category);
      } else {
        console.log('🔍 [MissingItems] ⚠️ "War 1293" category NOT found in category definitions');
      }
    }
    if (typeDefs && typeDefs.length > 0) {
      console.log('🔍 [MissingItems] Type definitions loaded:', typeDefs.map(type => ({
        name: type.name,
        id: type.id
      })));
    }
  }, [categoryDefs, typeDefs]);

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

  

  const groupedItems = useBanknoteGroups(
    sortedCollectionItems, 
    collectionSortFields, 
    categoryOrder,
    sultans,
    countryId,
    sultanOrderMap
  );

  

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
      sultan_ar: sultanGroup.sultan_ar,
      sultan_tr: sultanGroup.sultan_tr,
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
    sultans,
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
      sultan_ar: sultanGroup.sultan_ar,
      sultan_tr: sultanGroup.sultan_tr,
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
    setViewMode(mode);
  }, []);

  const isLoading = countryLoading || collectionDataLoading;

  const handlePreferencesLoaded = useCallback(() => {
    setPreferencesLoaded(true);
  }, []);

  

  // Determine the return path - if we're in profile view, it should return to profile
  const returnPath = userId ? `/profile/${user?.username}` : '/collection';

  // Remove the old useEffect hooks that were fetching data individually
  // The useCollectionData hook now handles all data fetching in parallel

  // Use the missing banknotes from the optimized hook
  const finalMissingBanknotes = missingBanknotes;

  console.log('🔍 [MissingItems] CountryDetailCollection - Received missing banknotes:', finalMissingBanknotes.length);
  
  // Log pick numbers in 40-60 range
  const initialPickNumbers40to60 = finalMissingBanknotes
    .map(b => {
      const pick = b.extendedPickNumber || (b as any).extended_pick_number || '';
      const match = pick.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null && num >= 40 && num <= 60);
  console.log('🔍 [MissingItems] Initial pick numbers 40-60:', initialPickNumbers40to60.length, 'samples:', initialPickNumbers40to60.slice(0, 10));

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
  
  console.log('🔍 [MissingItems] After mapping to CollectionItem structure:', missingCollectionItems.length);
  
  // Log pick numbers in 40-60 range after mapping
  const mappedPickNumbers40to60 = missingCollectionItems
    .map(item => {
      const pick = item.extendedPickNumber || '';
      const match = pick.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null && num >= 40 && num <= 60);
  console.log('🔍 [MissingItems] Pick numbers 40-60 after mapping:', mappedPickNumbers40to60.length, 'samples:', mappedPickNumbers40to60.slice(0, 10));
  
  // Filter missingCollectionItems before sorting/grouping
  const filteredMissingCollectionItems = useMemo(() => {
    console.log('🔍 [MissingItems] Starting filtering process');
    console.log('🔍 [MissingItems] Input items count:', missingCollectionItems.length);
    console.log('🔍 [MissingItems] Current filters:', {
      search: filters.search,
      categories: filters.categories,
      types: filters.types,
      sort: filters.sort
    });
    console.log('🔍 [MissingItems] Category defs count:', categoryDefs?.length || 0);
    console.log('🔍 [MissingItems] Type defs count:', typeDefs?.length || 0);
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
    
    // Log category mappings for debugging
    console.log('🔍 [MissingItems] Category name to ID mappings:', Object.keys(categoryNameToId).map(name => ({ name, id: categoryNameToId[name] })));
    console.log('🔍 [MissingItems] Type name to ID mappings:', Object.keys(typeNameToId).map(name => ({ name, id: typeNameToId[name] })));
    
    // Check specifically for 'War 1293 Banknotes' category
    const war1293CategoryId = categoryNameToId['War 1293 Banknotes  (1876-1877)'];
    console.log('🔍 [MissingItems] "War 1293 Banknotes  (1876-1877)" category ID:', war1293CategoryId);
    console.log('🔍 [MissingItems] All category names in mapping:', Object.keys(categoryNameToId));
    
    // Count items with 'War 1293 Banknotes' category before filtering
    const war1293ItemsBefore = missingCollectionItems.filter(item => {
      const category = item.category || '';
      return category.includes('War 1293') || category.includes('1293');
    });
    console.log('🔍 [MissingItems] Items with "War 1293" category before filtering:', war1293ItemsBefore.length);
    if (war1293ItemsBefore.length > 0) {
      console.log('🔍 [MissingItems] Sample "War 1293" items before filtering:', war1293ItemsBefore.slice(0, 5).map(item => ({
        pick: item.extendedPickNumber || 'N/A',
        category: item.category || 'N/A',
        type: item.type || 'N/A',
        id: item.id
      })));
    }

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
        
        // Log specifically for 'War 1293 Banknotes' category
        if (item.category && (item.category.includes('War 1293') || item.category.includes('1293'))) {
          console.log('🔍 [MissingItems] Processing "War 1293" item:', {
            pick: item.extendedPickNumber || 'N/A',
            category: item.category,
            itemCategoryId: itemCategoryId || 'NOT FOUND',
            filtersCategories: filters.categories,
            willBeFiltered: !itemCategoryId || !filters.categories.includes(itemCategoryId)
          });
        }
        
        if (!itemCategoryId) return false;

        const categoryMatch = filters.categories.includes(itemCategoryId);
        
        if (!categoryMatch) return false;
      }

      // Types filter - only apply if types are selected and we have type mappings
      if (filters.types && filters.types.length > 0 && Object.keys(typeNameToId).length > 0) {
        // Get the type ID for this item's type name
        let itemTypeId = typeNameToId[item.type];
        
        // Handle singular/plural mismatch for "Issued note" vs "Issued notes"
        if (!itemTypeId && item.type === 'Issued note') {
          itemTypeId = typeNameToId['Issued notes'];
        }
        if (!itemTypeId && item.type === 'Issued notes') {
          itemTypeId = typeNameToId['Issued note'];
        }
        
        // Log specifically for 'War 1293 Banknotes' category items
        if (item.category && (item.category.includes('War 1293') || item.category.includes('1293'))) {
          console.log('🔍 [MissingItems] Processing "War 1293" item type filter:', {
            pick: item.extendedPickNumber || 'N/A',
            category: item.category,
            type: item.type,
            itemTypeId: itemTypeId || 'NOT FOUND',
            filtersTypes: filters.types,
            willBeFiltered: itemTypeId ? !filters.types.includes(itemTypeId) : false
          });
        }
        
        // If we have a type ID for this item, check if it matches the selected types
        if (itemTypeId) {
          const typeMatch = filters.types.includes(itemTypeId);
          
          if (!typeMatch) {
            return false;
          }
        }
        // If no type ID is found for this item, don't filter it out - show all items
        // This ensures that items with missing or unmapped types are still displayed
      }

      return true;
    });

    console.log('🔍 [MissingItems] After filtering - filtered count:', filtered.length);
    console.log('🔍 [MissingItems] Items filtered out:', missingCollectionItems.length - filtered.length);
    
    // Count items with 'War 1293 Banknotes' category after filtering
    const war1293ItemsAfter = filtered.filter(item => {
      const category = item.category || '';
      return category.includes('War 1293') || category.includes('1293');
    });
    console.log('🔍 [MissingItems] Items with "War 1293" category after filtering:', war1293ItemsAfter.length);
    if (war1293ItemsAfter.length !== war1293ItemsBefore.length) {
      console.log('🔍 [MissingItems] ⚠️ "War 1293" items filtered out:', war1293ItemsBefore.length - war1293ItemsAfter.length);
    }
    
    // Log pick numbers in 40-60 range after filtering
    const filteredPickNumbers40to60 = filtered
      .map(item => {
        const pick = item.extendedPickNumber || '';
        const match = pick.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num): num is number => num !== null && num >= 40 && num <= 60);
    console.log('🔍 [MissingItems] Pick numbers 40-60 after filtering:', filteredPickNumbers40to60.length, 'samples:', filteredPickNumbers40to60.slice(0, 10));
    
    // Check which items were filtered out in the 40-60 range
    const filteredOut40to60 = missingCollectionItems
      .filter(item => {
        const pick = item.extendedPickNumber || '';
        const match = pick.match(/^(\d+)/);
        const num = match ? parseInt(match[1], 10) : null;
        return num !== null && num >= 40 && num <= 60 && !filtered.includes(item);
      })
      .map(item => ({
        pick: item.extendedPickNumber || 'N/A',
        category: item.category || 'N/A',
        type: item.type || 'N/A',
        id: item.id
      }));
    if (filteredOut40to60.length > 0) {
      console.log('🔍 [MissingItems] ⚠️ Items with pick 40-60 that were filtered out:', filteredOut40to60.length, 'samples:', filteredOut40to60.slice(0, 10));
      
      // Check how many of the filtered out 40-60 items are from 'War 1293' category
      const war1293FilteredOut40to60 = filteredOut40to60.filter(item => 
        item.category.includes('War 1293') || item.category.includes('1293')
      );
      if (war1293FilteredOut40to60.length > 0) {
        console.log('🔍 [MissingItems] ⚠️⚠️ "War 1293" items with pick 40-60 that were filtered out:', war1293FilteredOut40to60.length, 'items:', war1293FilteredOut40to60);
      }
    }

    return filtered;
  }, [missingCollectionItems, filters, categoryDefs, typeDefs]);

  // 2. Use the same sorting and grouping hooks for missing items - ensure default sort is applied
  const missingSortFields = filters.sort.length > 0 ? filters.sort : ['extPick'];
  console.log('🔍 [MissingItems] Sort fields:', missingSortFields);
  
  const sortedMissingItems = useBanknoteSorting({
    banknotes: filteredMissingCollectionItems,
    currencies,
    sortFields: missingSortFields
  });
  
  console.log('🔍 [MissingItems] After sorting - sorted count:', sortedMissingItems.length);
  
  // Log pick numbers in 40-60 range after sorting
  const sortedPickNumbers40to60 = sortedMissingItems
    .map(item => {
      const pick = item.extendedPickNumber || '';
      const match = pick.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null && num >= 40 && num <= 60);
  console.log('🔍 [MissingItems] Pick numbers 40-60 after sorting:', sortedPickNumbers40to60.length, 'samples:', sortedPickNumbers40to60.slice(0, 10));
  
  const groupedMissingItems = useBanknoteGroups(
    sortedMissingItems,
    missingSortFields,
    categoryOrder,
    sultans,
    countryId,
    sultanOrderMap
  );
  
  console.log('🔍 [MissingItems] After grouping - groups count:', groupedMissingItems.length);
  
  // Count total items in groups
  const totalItemsInGroups = groupedMissingItems.reduce((sum, group) => {
    const groupItems = group.items || [];
    const sultanItems = group.sultanGroups?.flatMap(sg => sg.items || []) || [];
    return sum + groupItems.length + sultanItems.length;
  }, 0);
  console.log('🔍 [MissingItems] Total items in groups:', totalItemsInGroups);
  
  // Log pick numbers in 40-60 range in grouped items
  const allGroupedItems = groupedMissingItems.flatMap(group => {
    const groupItems = group.items || [];
    const sultanItems = group.sultanGroups?.flatMap(sg => sg.items || []) || [];
    return [...groupItems, ...sultanItems];
  });
  const groupedPickNumbers40to60 = allGroupedItems
    .map(item => {
      const pick = item.extendedPickNumber || '';
      const match = pick.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num): num is number => num !== null && num >= 40 && num <= 60);
  console.log('🔍 [MissingItems] Pick numbers 40-60 in grouped items:', groupedPickNumbers40to60.length, 'samples:', groupedPickNumbers40to60.slice(0, 10));
  
  // Log group structure
  console.log('🔍 [MissingItems] Group structure:', groupedMissingItems.map(g => ({
    category: g.category,
    itemsCount: g.items?.length || 0,
    sultanGroupsCount: g.sultanGroups?.length || 0
  })));

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
    sultans,
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
        console.log('🔍 [MissingItems] Flattening missing items for display');
        console.log('🔍 [MissingItems] Groups to flatten:', groupedMissingItems.length);
        
        const flattenedItems: CollectionItem[] = [];
        
        groupedMissingItems.forEach((group, groupIndex) => {
          if (group.sultanGroups && group.sultanGroups.length > 0) {
            group.sultanGroups.forEach(sultanGroup => {
              flattenedItems.push(...sultanGroup.items);
            });
          } else {
            flattenedItems.push(...group.items);
          }
        });
        
        console.log('🔍 [MissingItems] Flattened items count:', flattenedItems.length);
        
        // Log pick numbers in 40-60 range in flattened items
        const flattenedPickNumbers40to60 = flattenedItems
          .map(item => {
            const pick = item.extendedPickNumber || '';
            const match = pick.match(/^(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter((num): num is number => num !== null && num >= 40 && num <= 60);
        console.log('🔍 [MissingItems] Pick numbers 40-60 in flattened items:', flattenedPickNumbers40to60.length, 'samples:', flattenedPickNumbers40to60.slice(0, 10));
        
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
    if (tab === 'missing') {
      console.log('🔍 [MissingItems] ========== MISSING TAB CLICKED ==========');
      console.log('🔍 [MissingItems] Country:', effectiveCountryName, 'CountryId:', countryId);
      console.log('🔍 [MissingItems] Current missingBanknotes count:', missingBanknotes.length);
      console.log('🔍 [MissingItems] Current groupedMissingItems count:', groupedMissingItems.length);
    }
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
        preferencesLoaded={preferencesLoaded}
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
        (() => {
          console.log('🔍 [MissingItems] Rendering missing items tab');
          console.log('🔍 [MissingItems] Groups being passed to CollectionItemsDisplay:', groupedMissingItems.length);
          console.log('🔍 [MissingItems] Total items in all groups:', groupedMissingItems.reduce((sum, g) => {
            const groupItems = g.items?.length || 0;
            const sultanItems = g.sultanGroups?.reduce((s, sg) => s + (sg.items?.length || 0), 0) || 0;
            return sum + groupItems + sultanItems;
          }, 0));
          
          return (
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
          );
        })()
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
