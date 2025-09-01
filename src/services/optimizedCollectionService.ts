import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, DetailedBanknote } from "@/types";
import { DynamicFilterState } from "@/types/filter";
import { mapBanknoteFromDatabase } from "@/services/banknoteService";
import { normalizeBanknoteData } from "@/services/collectionService";

// Optimized collection service with combined queries and server-side filtering

/**
 * Fetches user collection with optimized single query using JOINs
 * Combines all related data in one database roundtrip
 */
export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    console.log(`[OptimizedCollection] Fetching collection for user: ${userId}`);
    const startTime = performance.now();

    // Single optimized query to fetch all collection items with related data
    const { data: collectionItems, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
        *,
        private_note_ar,
        private_note_tr,
        location_ar,
        location_tr,
        type_ar,
        type_tr,
        enhanced_banknotes_with_translations(*),
        unlisted_banknotes(*)
      `)
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (collectionError) {
      console.error("[OptimizedCollection] Error fetching collection items:", collectionError);
      return [];
    }

    const enrichedItems = processCollectionItems(collectionItems || []);
    
    const endTime = performance.now();
    console.log(`[OptimizedCollection] Fetched ${enrichedItems.length} items in ${(endTime - startTime).toFixed(2)}ms`);
    
    return enrichedItems;
  } catch (error) {
    console.error("[OptimizedCollection] Error:", error);
    return [];
  }
}

/**
 * Fetches user collection filtered by country with optimized queries
 * Uses server-side filtering to reduce data transfer
 */
export async function fetchUserCollectionByCountry(userId: string, countryId: string): Promise<CollectionItem[]> {
  try {
    console.log(`[OptimizedCollection] Fetching collection for user: ${userId} and country: ${countryId}`);
    const startTime = performance.now();

    // Get country name first (cached query)
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();

    if (countryError || !countryData) {
      console.error(`[OptimizedCollection] Country not found for ID: ${countryId}`, countryError);
      return [];
    }

    const countryName = countryData.name;

    // Parallel queries for detailed and unlisted banknotes
    const [detailedResult, unlistedResult] = await Promise.all([
      // Detailed banknotes with JOIN filtering
      supabase
        .from('collection_items')
        .select(`
        *,
        private_note_ar,
        private_note_tr,
        location_ar,
        location_tr,
        type_ar,
        type_tr,
        enhanced_banknotes_with_translations!inner(*)
      `)
      .eq('user_id', userId)
      .eq('enhanced_banknotes_with_translations.country', countryName)
        .eq('is_unlisted_banknote', false)
        .order('order_index', { ascending: true }),
      
      // Unlisted banknotes with JOIN filtering  
      supabase
        .from('collection_items')
        .select(`
          *,
          unlisted_banknotes!inner(*)
        `)
        .eq('user_id', userId)
        .eq('is_unlisted_banknote', true)
        .eq('unlisted_banknotes.country', countryName)
        .order('order_index', { ascending: true })
    ]);

    if (detailedResult.error) {
      console.error("[OptimizedCollection] Error fetching detailed items:", detailedResult.error);
    }
    
    if (unlistedResult.error) {
      console.error("[OptimizedCollection] Error fetching unlisted items:", unlistedResult.error);
    }

    // Combine and process results
    const allItems = [
      ...(detailedResult.data || []),
      ...(unlistedResult.data || [])
    ];

    const enrichedItems = processCollectionItems(allItems);
    
    const endTime = performance.now();
    console.log(`[OptimizedCollection] Fetched ${enrichedItems.length} items for country ${countryName} in ${(endTime - startTime).toFixed(2)}ms`);
    
    return enrichedItems;
  } catch (error) {
    console.error("[OptimizedCollection] Error:", error);
    return [];
  }
}

/**
 * Fetches collection with server-side filtering
 * Applies search, category, and type filters at the database level
 */
export async function fetchFilteredUserCollection(
  userId: string, 
  countryId: string, 
  filters: DynamicFilterState
): Promise<CollectionItem[]> {
  try {
    console.log(`[OptimizedCollection] Fetching filtered collection:`, {
      userId,
      countryId,
      filters
    });
    const startTime = performance.now();

    // Get country name
    const { data: countryData } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();

    if (!countryData) return [];

    const countryName = countryData.name;

    // Build base queries with filters
    let detailedQuery = supabase
      .from('collection_items')
      .select(`
        *,
        enhanced_detailed_banknotes!inner(*)
      `)
      .eq('user_id', userId)
      .eq('enhanced_detailed_banknotes.country', countryName)
      .eq('is_unlisted_banknote', false);

    let unlistedQuery = supabase
      .from('collection_items')
      .select(`
        *,
        unlisted_banknotes!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_unlisted_banknote', true)
      .eq('unlisted_banknotes.country', countryName);

    // Apply search filter at database level
    if (filters.search && filters.search.trim()) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      
      detailedQuery = detailedQuery.or(`
        enhanced_detailed_banknotes.denomination.ilike.${searchTerm},
        enhanced_detailed_banknotes.extended_pick_number.ilike.${searchTerm},
        enhanced_detailed_banknotes.series.ilike.${searchTerm},
        enhanced_detailed_banknotes.type.ilike.${searchTerm}
      `);
      
      unlistedQuery = unlistedQuery.or(`
        unlisted_banknotes.face_value.ilike.${searchTerm},
        unlisted_banknotes.extended_pick_number.ilike.${searchTerm},
        unlisted_banknotes.category.ilike.${searchTerm},
        unlisted_banknotes.type.ilike.${searchTerm}
      `);
    }

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
      // Note: This requires mapping category IDs to names first
      // For now, we'll handle this client-side for simplicity
    }

    // Apply type filter  
    if (filters.types && filters.types.length > 0) {
      // Note: This requires mapping type IDs to names first
      // For now, we'll handle this client-side for simplicity
    }

    // Execute parallel queries
    const [detailedResult, unlistedResult] = await Promise.all([
      detailedQuery.order('order_index', { ascending: true }),
      unlistedQuery.order('order_index', { ascending: true })
    ]);

    if (detailedResult.error || unlistedResult.error) {
      console.error("[OptimizedCollection] Query errors:", {
        detailed: detailedResult.error,
        unlisted: unlistedResult.error
      });
    }

    const allItems = [
      ...(detailedResult.data || []),
      ...(unlistedResult.data || [])
    ];

    const enrichedItems = processCollectionItems(allItems);
    
    const endTime = performance.now();
    console.log(`[OptimizedCollection] Fetched ${enrichedItems.length} filtered items in ${(endTime - startTime).toFixed(2)}ms`);
    
    return enrichedItems;
  } catch (error) {
    console.error("[OptimizedCollection] Error in filtered fetch:", error);
    return [];
  }
}

/**
 * Optimized metadata extraction from collection items
 * Uses efficient mapping and counting techniques
 */
export async function fetchBanknoteCategoriesAndTypes(items: CollectionItem[]): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> {
  try {
    console.log("[OptimizedCollection] Processing metadata for", items.length, "items");
    const startTime = performance.now();
    
    // Use Map for O(1) lookups and counting
    const categoriesMap = new Map<string, { id: string; name: string; count: number }>();
    const typesMap = new Map<string, { id: string; name: string; count: number }>();
    
    // Single pass through items for efficient processing
    for (const item of items) {
      const banknote = item.banknote;
      if (!banknote) continue;

      // Process category
      if (banknote.category) {
        const categoryName = banknote.category;
        const categoryId = generateStableIdFromName(categoryName);
        
        const existing = categoriesMap.get(categoryName);
        if (existing) {
          existing.count++;
        } else {
          categoriesMap.set(categoryName, {
            id: categoryId,
            name: categoryName,
            count: 1
          });
        }
      }
      
      // Process type
      if (banknote.type) {
        const typeName = banknote.type;
        const typeId = generateStableIdFromName(typeName);
        
        const existing = typesMap.get(typeName);
        if (existing) {
          existing.count++;
        } else {
          typesMap.set(typeName, {
            id: typeId,
            name: typeName,
            count: 1
          });
        }
      }
    }
    
    // Convert to arrays and sort by count (descending) for better UX
    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => b.count - a.count);
    
    const types = Array.from(typesMap.values())
      .sort((a, b) => b.count - a.count);
    
    const endTime = performance.now();
    console.log(`[OptimizedCollection] Processed metadata in ${(endTime - startTime).toFixed(2)}ms:`, {
      categories: categories.length,
      types: types.length
    });
    
    return { categories, types };
  } catch (error) {
    console.error("[OptimizedCollection] Error extracting metadata:", error);
    return { categories: [], types: [] };
  }
}

/**
 * Shared processing function for collection items
 * Normalizes data from both detailed and unlisted banknotes
 */
function processCollectionItems(rawItems: any[]): CollectionItem[] {
  const enrichedItems: CollectionItem[] = [];

  for (const item of rawItems) {
    let banknote: DetailedBanknote | null = null;

    if (item.is_unlisted_banknote) {
      // Process unlisted banknote
      const unlistedData = item.unlisted_banknotes;
      if (unlistedData) {
        // Set default category if not provided
        if (!unlistedData.category) {
          unlistedData.category = 'Unlisted Banknotes';
        }
        banknote = normalizeBanknoteData(unlistedData, "unlisted");
      }
      } else {
        // Process detailed banknote
        const banknoteData = item.enhanced_banknotes_with_translations;
        if (banknoteData) {
          banknote = normalizeBanknoteData(mapBanknoteFromDatabase(banknoteData), "detailed");
        }
      }

    if (banknote) {
      enrichedItems.push({
        id: item.id,
        userId: item.user_id,
        banknoteId: item.is_unlisted_banknote ? item.unlisted_banknotes_id : item.banknote_id,
        banknote_id: item.is_unlisted_banknote ? item.unlisted_banknotes_id : item.banknote_id,
        user_id: item.user_id,
        banknote,
        condition: item.condition,
        grade_by: item.grade_by,
        grade: item.grade,
        grade_condition_description: item.grade_condition_description,
        salePrice: item.sale_price,
        isForSale: item.is_for_sale,
        is_for_sale: item.is_for_sale,
        publicNote: item.public_note,
        privateNote: item.private_note,
        purchasePrice: item.purchase_price,
        purchaseDate: item.purchase_date,
        location: item.location,
        obverseImage: item.obverse_image,
        reverseImage: item.reverse_image,
        obverse_image_watermarked: item.obverse_image_watermarked,
        reverse_image_watermarked: item.reverse_image_watermarked,
        obverse_image_thumbnail: item.obverse_image_thumbnail,
        reverse_image_thumbnail: item.reverse_image_thumbnail,
        orderIndex: item.order_index,
        order_index: item.order_index,
        createdAt: item.created_at,
        created_at: item.created_at,
        updatedAt: item.updated_at,
        updated_at: item.updated_at,
        is_unlisted_banknote: item.is_unlisted_banknote,
        unlisted_banknotes_id: item.unlisted_banknotes_id,
        hide_images: item.hide_images || false,
        type: item.type,
        prefix: item.prefix,
        // Add translation fields
        private_note_ar: item.private_note_ar,
        private_note_tr: item.private_note_tr,
        location_ar: item.location_ar,
        location_tr: item.location_tr,
        type_ar: item.type_ar,
        type_tr: item.type_tr
      } as CollectionItem);
    }
  }

  return enrichedItems;
}

/**
 * Generates a stable ID based on a string name
 * Creates a deterministic UUID-like string for consistent IDs
 */
function generateStableIdFromName(name: string): string {
  // Simple hash function to get a number from a string
  let hash = 0;
  if (name.length === 0) return 'empty-name-id';
  
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert the hash to a hex string and use it as part of a UUID format
  const hashString = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hashString}-${hashString.substr(0, 4)}-4${hashString.substr(4, 3)}-${hashString.substr(7, 4)}-${hashString.substr(0, 12)}`;
}