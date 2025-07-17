import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, DetailedBanknote } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { fetchBanknoteById } from "@/services/banknoteService";
import { fetchCountryById } from "@/services/countryService";
import { BanknoteCondition } from "@/types";
import type { Database } from "@/integrations/supabase/types";
import { mapBanknoteFromDatabase } from "@/services/banknoteService";
import { processAndUploadImage } from './imageProcessingService';

export { processAndUploadImage } from './imageProcessingService';

// Type definition for collection items table insert
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

export async function uploadCollectionImage(file: File): Promise<{
  original: string;
  watermarked: string;
  thumbnail: string;
}> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error("User not authenticated");

    const userId = user.data.user.id;
    const processedImages = await processAndUploadImage(file, 'collection-items', userId);
    return processedImages;
  } catch (error) {
    console.error("Error in uploadCollectionImage:", error);
    throw error;
  }
}

export type { CollectionItem };

// Helper function to normalize banknote data from different sources
export function normalizeBanknoteData(data: any, source: 'detailed' | 'unlisted'): DetailedBanknote {
  if (source === 'unlisted') {
    // Handle unlisted banknote data
    return {
      id: data.id,
      catalogId: data.catalog_id || '',
      extendedPickNumber: data.extended_pick_number || '',
      pickNumber: data.pick_number || '',
      turkCatalogNumber: data.turk_catalog_number || '',
      country: data.country || '',
      denomination: data.face_value || '',
      year: data.gregorian_year || data.islamic_year || '',
      series: '',
      description: data.banknote_description || '',
      historicalDescription: data.historical_description || '',
      obverseDescription: '',
      reverseDescription: '',
      imageUrls: [data.front_picture, data.back_picture].filter(Boolean),
      frontPicture: data.front_picture || null,
      backPicture: data.back_picture || null,
      frontPictureWatermarked: data.front_picture_watermarked || null,
      backPictureWatermarked: data.back_picture_watermarked || null,
      frontPictureThumbnail: data.front_picture_thumbnail || null,
      backPictureThumbnail: data.back_picture_thumbnail || null,
      isApproved: data.is_approved || false,
      isPending: data.is_pending || true,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      // Add unlisted banknote specific fields
      sultanName: data.sultan_name || '',
      type: data.type || '',
      category: data.category || 'Unlisted Banknotes', // Default category for unlisted banknotes
      rarity: data.rarity || '',
      printer: data.printer || '',
      name: data.name || '',
      sealNames: data.seal_names || '',
      // Add empty arrays for stamp URLs since unlisted banknotes don't have stamps
      signaturesFrontUrls: [],
      signaturesBackUrls: [],
      sealPictureUrls: [],
      watermarkUrl: null,
      tughraUrl: null,
      authorityName: null,
      // Add other fields that might be needed
      signaturePictureUrls: data.signature_pictures || [],
      sealPictures: data.seal_pictures || [],
      watermarkPicture: data.watermark_picture || null,
      tughraPicture: data.tughra_picture || null,
      otherElementPictures: data.other_element_pictures || [],
      securityElement: data.security_element || '',
      serialNumbering: data.serial_numbering || '',
      colors: data.colors || ''
    } as DetailedBanknote;
  } else {
    // For detailed banknotes, the data is already normalized by mapBanknoteFromDatabase
    return data;
  }
}

// --- Optimized fetchUserCollection with JOIN-based batch queries ---

export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    console.log(`[fetchUserCollection] Fetching collection for user: ${userId}`);

    // Single optimized query to fetch all collection items
    const { data: collectionItems, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
        *,
        enhanced_detailed_banknotes(*),
        unlisted_banknotes(*)
      `)
      .eq('user_id', userId);

    if (collectionError) {
      console.error("[fetchUserCollection] Error fetching collection items:", collectionError);
      return [];
    }

    const enrichedItems: CollectionItem[] = [];

    // Process both detailed and unlisted banknotes
    if (collectionItems) {
      for (const item of collectionItems) {
        let banknote;

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
          const banknoteData = item.enhanced_detailed_banknotes;
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
            prefix: item.prefix
          } as CollectionItem);
        }
      }
    }

    console.log(`[fetchUserCollection] Successfully fetched ${enrichedItems.length} items with optimized JOIN query`);
    return enrichedItems;
  } catch (error) {
    console.error("[fetchUserCollection] Error:", error);
    return [];
  }
}

// For these helpers, delegate to fetchUserCollection (no change needed)
export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  return fetchUserCollection(userId);
}

// --- Update fetchUserCollectionByCountry: use optimized query with country filtering ---
export async function fetchUserCollectionByCountry(userId: string, countryId: string): Promise<CollectionItem[]> {
  try {
    console.log(`[fetchUserCollectionByCountry] Fetching collection for user: ${userId} and country: ${countryId}`);

    // Get country name first
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();

    if (countryError || !countryData) {
      console.error(`[fetchUserCollectionByCountry] Country not found for ID: ${countryId}`, countryError);
      return [];
    }

    const countryName = countryData.name;

    // Optimized query: filter by country at database level using JOIN
    const { data: collectionItems, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
        *,
        enhanced_detailed_banknotes!inner(*),
        unlisted_banknotes(*)
      `)
      .eq('user_id', userId)
      .eq('enhanced_detailed_banknotes.country', countryName);

    if (collectionError) {
      console.error("[fetchUserCollectionByCountry] Error fetching collection items:", collectionError);
      return [];
    }

    // Also fetch unlisted banknotes for this country
    const { data: unlistedItems, error: unlistedError } = await supabase
      .from('collection_items')
      .select(`
        *,
        unlisted_banknotes!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_unlisted_banknote', true)
      .eq('unlisted_banknotes.country', countryName);

    if (unlistedError) {
      console.error("[fetchUserCollectionByCountry] Error fetching unlisted items:", unlistedError);
    }

    const enrichedItems: CollectionItem[] = [];

    // Process detailed banknotes
    if (collectionItems) {
      for (const item of collectionItems) {
        const banknoteData = item.enhanced_detailed_banknotes;
        if (banknoteData) {
          const banknote = normalizeBanknoteData(mapBanknoteFromDatabase(banknoteData), "detailed");
          
          enrichedItems.push({
            id: item.id,
            userId: item.user_id,
            banknoteId: item.banknote_id,
            banknote_id: item.banknote_id,
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
            is_unlisted_banknote: false,
            hide_images: item.hide_images || false,
            type: item.type,
            prefix: item.prefix
          } as CollectionItem);
        }
      }
    }

    // Process unlisted banknotes
    if (unlistedItems) {
      for (const item of unlistedItems) {
          const unlistedData = item.unlisted_banknotes;
          if (unlistedData) {
            // Set default category if not provided
            if (!unlistedData.category) {
              unlistedData.category = 'Unlisted Banknotes';
            }
          const banknote = normalizeBanknoteData(unlistedData, "unlisted");
          
          enrichedItems.push({
            id: item.id,
            userId: item.user_id,
            banknoteId: item.unlisted_banknotes_id,
            banknote_id: item.unlisted_banknotes_id,
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
            is_unlisted_banknote: true,
            unlisted_banknotes_id: item.unlisted_banknotes_id,
            hide_images: item.hide_images || false,
            type: item.type,
            prefix: item.prefix
          } as CollectionItem);
        }
      }
    }

    console.log(`[fetchUserCollectionByCountry] Successfully fetched ${enrichedItems.length} items for country ${countryName}`);
    return enrichedItems;
  } catch (error) {
    console.error("[fetchUserCollectionByCountry] Error:", error);
    return [];
  }
}

/**
 * Fetches user's collection items filtered by country
 * @param userId The user ID
 * @param countryId The country ID to filter by
 * @returns Collection items for the specified country
 */


export async function fetchBanknoteCategoriesAndTypes(items: CollectionItem[]): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> {
  try {
    console.log("[fetchBanknoteCategoriesAndTypes] Processing collection items:", items.length);
    
    // Extract unique categories and types from collection items
    const categoriesMap = new Map<string, { id: string; name: string; count: number }>();
    const typesMap = new Map<string, { id: string; name: string; count: number }>();
    
    // Process each item to count categories and types
    items.forEach(item => {
      if (item.banknote?.category) {
        const categoryName = item.banknote.category;
        // Generate a deterministic UUID-like ID based on the category name
        // This ensures the same name always gets the same ID
        const categoryId = generateStableIdFromName(categoryName);
        
        if (categoriesMap.has(categoryName)) {
          const category = categoriesMap.get(categoryName)!;
          category.count++;
          categoriesMap.set(categoryName, category);
        } else {
          categoriesMap.set(categoryName, {
            id: categoryId,
            name: categoryName,
            count: 1
          });
        }
      }
      
      if (item.banknote?.type) {
        const typeName = item.banknote.type;
        // Generate a deterministic UUID-like ID based on the type name
        const typeId = generateStableIdFromName(typeName);
        
        if (typesMap.has(typeName)) {
          const type = typesMap.get(typeName)!;
          type.count++;
          typesMap.set(typeName, type);
        } else {
          typesMap.set(typeName, {
            id: typeId,
            name: typeName,
            count: 1
          });
        }
      }
    });
    
    // Convert maps to arrays and sort by count (descending)
    const categories = Array.from(categoriesMap.values())
      .sort((a, b) => b.count - a.count);
    
    const types = Array.from(typesMap.values())
      .sort((a, b) => b.count - a.count);
    
    console.log("[fetchBanknoteCategoriesAndTypes] Generated categories:", categories);
    console.log("[fetchBanknoteCategoriesAndTypes] Generated types:", types);
    
    return { categories, types };
  } catch (error) {
    console.error("Error extracting categories and types:", error);
    return { categories: [], types: [] };
  }
}

/**
 * Generates a stable ID based on a string name
 * This creates a deterministic UUID-like string that will be the same for the same input
 * @param name The string to generate an ID from
 * @returns A UUID-like string
 */
function generateStableIdFromName(name: string): string {
  // Simple hash function to get a number from a string
  let hash = 0;
  if (name.length === 0) return uuidv4();
  
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert the hash to a hex string and use it as part of a UUID format
  const hashString = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hashString}-${hashString.substr(0, 4)}-4${hashString.substr(4, 3)}-${hashString.substr(7, 4)}-${hashString.substr(0, 12)}`;
}

// --- Update fetchCollectionItem to use dynamic banknote joining ---
export async function fetchCollectionItem(itemId: string): Promise<CollectionItem | null> {
  try {
    console.log('[fetchCollectionItem] Fetching collection item:', itemId);

    const { data: item, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        enhanced_detailed_banknotes(*),
        unlisted_banknotes(*)
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('[fetchCollectionItem] Error:', error);
      return null;
    }

    console.log('[fetchCollectionItem] Collection item data:', item);

    let banknote;
    if (item.is_unlisted_banknote) {
      const unlistedData = item.unlisted_banknotes;
      if (unlistedData) {
        banknote = normalizeBanknoteData(unlistedData, "unlisted");
      }
    } else {
      const banknoteData = item.enhanced_detailed_banknotes;
      if (banknoteData) {
        banknote = await mapBanknoteFromDatabase(banknoteData);
      }
    }

    if (!banknote) {
      console.error('[fetchCollectionItem] No banknote data found');
      return null;
    }

    return {
      id: item.id,
      userId: item.user_id,
      banknoteId: item.is_unlisted_banknote ? item.unlisted_banknotes_id : item.banknote_id,
      banknote,
      condition: item.condition,
      grade_by: item.grade_by,
      grade: item.grade,
      grade_condition_description: item.grade_condition_description,
      salePrice: item.sale_price,
      isForSale: item.is_for_sale,
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
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      is_unlisted_banknote: item.is_unlisted_banknote,
      unlisted_banknotes_id: item.unlisted_banknotes_id,
      hide_images: item.hide_images || false , 
      type: item.type,
      prefix: item.prefix
    } as CollectionItem;
  } catch (error) {
    console.error('[fetchCollectionItem] Error:', error);
    return null;
  }
}

export async function addToCollection(
  params: {
    userId: string;
    banknoteId: string;
    // condition: BanknoteCondition;
    // purchasePrice?: number;
    // purchaseDate?: string;
    // publicNote?: string;
    // privateNote?: string;
    // salePrice?: number;
    // isForSale?: boolean;
  }
): Promise<CollectionItem | null> {
  try {
    console.log("Adding banknote to collection:", params);

    // Get current highest order index
    const { data: highestItem } = await supabase
      .from('collection_items')
      .select('order_index')
      .eq('user_id', params.userId)
      .order('order_index', { ascending: false })
      .limit(1);
    
    const orderIndex = highestItem && highestItem.length > 0 ? highestItem[0].order_index + 1 : 0;
    
    const newItem = {
      user_id: params.userId,
      banknote_id: params.banknoteId,
      // condition: params.condition,
      // purchase_price: params.purchasePrice || null,
      // purchase_date: params.purchaseDate || null,
      // public_note: params.publicNote || null,
      // private_note: params.privateNote || null,
      // order_index: orderIndex,
      // is_for_sale: params.isForSale || false,
      // sale_price: params.salePrice || null
    };

    const { data: insertedItem, error } = await supabase
      .from('collection_items')
      .insert([newItem])
      .select('*')
      .single();
    
    
    if (error) {
      console.error("Error adding to collection:", error);
      throw error;
    }

    // Fetch the banknote details
    const banknote = await fetchBanknoteById(insertedItem.banknote_id);
    
    const collectionItem: CollectionItem = {
      id: insertedItem.id,
      user_id: insertedItem.user_id,
      userId: insertedItem.user_id,
      banknoteId: insertedItem.banknote_id,
      banknote: banknote!,
      condition: insertedItem.condition as BanknoteCondition,
      grade_by: insertedItem.grade_by,
      grade: insertedItem.grade,
      grade_condition_description: insertedItem.grade_condition_description,
      salePrice: insertedItem.sale_price,
      isForSale: insertedItem.is_for_sale || false,
      is_for_sale: insertedItem.is_for_sale || false,
      publicNote: insertedItem.public_note,
      privateNote: insertedItem.private_note,
      purchasePrice: insertedItem.purchase_price,
      purchaseDate: insertedItem.purchase_date,
      location: insertedItem.location,
      obverseImage: insertedItem.obverse_image,
      reverseImage: insertedItem.reverse_image,
      obverse_image_watermarked: insertedItem.obverse_image_watermarked,
      reverse_image_watermarked: insertedItem.reverse_image_watermarked,
      obverse_image_thumbnail: insertedItem.obverse_image_thumbnail,
      reverse_image_thumbnail: insertedItem.reverse_image_thumbnail,
      orderIndex: insertedItem.order_index || 0,
      order_index: insertedItem.order_index || 0,
      createdAt: insertedItem.created_at,
      created_at: insertedItem.created_at,
      updatedAt: insertedItem.updated_at,
      updated_at: insertedItem.updated_at,
      is_unlisted_banknote: insertedItem.is_unlisted_banknote,
      hide_images: insertedItem.hide_images || false,
      type: insertedItem.type,
      prefix: insertedItem.prefix
    };

    return collectionItem;
  } catch (error) {
    console.error("Error in addToCollection:", error);
    return null;
  }
}

export async function removeFromCollection(collectionItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', collectionItemId);
    
    if (error) {
      console.error("Error removing from collection:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeFromCollection:", error);
    return false;
  }
}

export async function updateCollectionItem(itemId: string, updateData: any) {
  try {
    console.log('Updating collection item:', itemId, updateData);
    
    const { data, error } = await supabase
      .from('collection_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection item:', error);
      throw error;
    }

    console.log('Collection item updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to update collection item:', error);
    throw error;
  }
}

export async function updateCollectionItemImages(
  collectionItemId: string,
  obverseImages?: {
    original?: string;
    watermarked?: string;
    thumbnail?: string;
  },
  reverseImages?: {
    original?: string;
    watermarked?: string;
    thumbnail?: string;
  }
): Promise<boolean> {
  try {
    const updates: any = {};
    
    if (obverseImages) {
      if (obverseImages.original !== undefined) updates.obverse_image = obverseImages.original;
      if (obverseImages.watermarked !== undefined) updates.obverse_image_watermarked = obverseImages.watermarked;
      if (obverseImages.thumbnail !== undefined) updates.obverse_image_thumbnail = obverseImages.thumbnail;
    }
    
    if (reverseImages) {
      if (reverseImages.original !== undefined) updates.reverse_image = reverseImages.original;
      if (reverseImages.watermarked !== undefined) updates.reverse_image_watermarked = reverseImages.watermarked;
      if (reverseImages.thumbnail !== undefined) updates.reverse_image_thumbnail = reverseImages.thumbnail;
    }
    
    if (Object.keys(updates).length === 0) return true; // Nothing to update
    
    const { error } = await supabase
      .from('collection_items')
      .update(updates)
      .eq('id', collectionItemId);
    
    if (error) {
      console.error("Error updating collection item images:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateCollectionItemImages:", error);
    return false;
  }
}

/**
 * Fetches collection sort options for the specified country
 * @param countryId The ID of the country to fetch sort options for
 * @returns Array of sort options with name, field_name, is_required properties
 */
export async function fetchCollectionSortOptionsByCountryId(countryId: string) {
  try {
    console.log("[fetchCollectionSortOptionsByCountryId] Fetching sort options for country:", countryId);
    
    // First try to get country-specific sort options
    const { data: sortOptions, error } = await supabase
      .from('banknote_sort_options')
      .select('id, name, field_name, is_default, is_required, display_order')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error("[fetchCollectionSortOptionsByCountryId] Error fetching sort options:", error);
      throw error;
    }
    
    // Add collection-specific sort options if they don't exist
    const result = [...(sortOptions || [])];
    
    // Check if we have these collection-specific options
    const hasConditionOption = result.some(opt => opt.field_name === 'condition');
    const hasPurchaseDateOption = result.some(opt => opt.field_name === 'purchaseDate');
    
    if (!hasConditionOption) {
      result.push({
        id: 'condition-default',
        name: 'Condition',
        field_name: 'condition',
        is_default: false,
        is_required: false,
        display_order: result.length + 1
      });
    }
    
    if (!hasPurchaseDateOption) {
      result.push({
        id: 'purchaseDate-default',
        name: 'Purchase Date',
        field_name: 'purchaseDate',
        is_default: false,
        is_required: false,
        display_order: result.length + 1
      });
    }
    
    console.log("[fetchCollectionSortOptionsByCountryId] Returning sort options:", result);
    return result;
  } catch (error) {
    console.error("[fetchCollectionSortOptionsByCountryId] Error:", error);
    
    // Return default sort options on error
    return [
      { 
        id: "extPick-default", 
        name: "Catalog Number", 
        field_name: "extPick", 
        is_default: true, 
        is_required: true, 
        display_order: 1 
      },
      { 
        id: "newest-default", 
        name: "Newest First", 
        field_name: "newest", 
        is_default: false, 
        is_required: false, 
        display_order: 2 
      },
      { 
        id: "sultan-default", 
        name: "Sultan", 
        field_name: "sultan", 
        is_default: false, 
        is_required: false, 
        display_order: 3 
      },
      { 
        id: "faceValue-default", 
        name: "Face Value", 
        field_name: "faceValue", 
        is_default: false, 
        is_required: false, 
        display_order: 4 
      },
      { 
        id: "condition-default", 
        name: "Condition", 
        field_name: "condition", 
        is_default: false, 
        is_required: false, 
        display_order: 5 
      },
      { 
        id: "purchaseDate-default", 
        name: "Purchase Date", 
        field_name: "purchaseDate", 
        is_default: false, 
        is_required: false, 
        display_order: 6 
      }
    ];
  }
}

/**
 * Fetches user's collection filter preferences
 * @param userId The user ID
 * @param countryId The country ID (optional)
 * @returns User's filter preferences
 */
export async function fetchCollectionFilterPreferences(userId: string, countryId?: string) {
  try {
    console.log("[fetchCollectionFilterPreferences] Fetching for user:", userId, "country:", countryId);
    
    let query = supabase
      .from('user_filter_preferences')
      .select('*')
      .eq('user_id', userId);
    
    // Add country filter if provided
    if (countryId) {
      query = query.eq('country_id', countryId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error("[fetchCollectionFilterPreferences] Error fetching preferences:", error);
      throw error;
    }
    
    console.log("[fetchCollectionFilterPreferences] Preferences data:", data);
    
    return data || null;
  } catch (error) {
    console.error("[fetchCollectionFilterPreferences] Error:", error);
    return null;
  }
}

/**
 * Saves user's collection filter preferences
 * @param userId The user ID
 * @param countryId The country ID (optional)
 * @param categories Selected category IDs
 * @param types Selected type IDs
 * @param sortOptions Selected sort option IDs
 * @param groupMode Group mode enabled/disabled
 * @returns Success boolean
 */
export async function saveCollectionFilterPreferences(
  userId: string,
  countryId: string | null,
  categories: string[],
  types: string[],
  sortOptions: string[],
  groupMode: boolean
): Promise<boolean> {
  try {
    console.log("[saveCollectionFilterPreferences] Saving preferences:", {
      userId, countryId, categories, types, sortOptions, groupMode
    });
    
    // Validate that we have valid UUIDs
    const validatedCategories = categories.filter(id => isValidUuid(id));
    const validatedTypes = types.filter(id => isValidUuid(id));
    const validatedSortOptions = sortOptions.filter(id => isValidUuid(id));
    
    console.log("[saveCollectionFilterPreferences] After validation:", {
      categoriesBefore: categories.length, categoriesAfter: validatedCategories.length,
      typesBefore: types.length, typesAfter: validatedTypes.length,
      sortBefore: sortOptions.length, sortAfter: validatedSortOptions.length
    });
    
    // First check if a record already exists
    const { data: existingPrefs, error: queryError } = await supabase
      .from('user_filter_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('country_id', countryId || null)
      .maybeSingle();
      
    if (queryError) {
      console.error("[saveCollectionFilterPreferences] Error checking existing preferences:", queryError);
      throw queryError;
    }
    
    if (existingPrefs) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_filter_preferences')
        .update({
          selected_categories: validatedCategories,
          selected_types: validatedTypes,
          selected_sort_options: validatedSortOptions,
          group_mode: groupMode,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPrefs.id);
        
      if (updateError) {
        console.error("[saveCollectionFilterPreferences] Error updating preferences:", updateError);
        throw updateError;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_filter_preferences')
        .insert({
          user_id: userId,
          country_id: countryId,
          selected_categories: validatedCategories,
          selected_types: validatedTypes,
          selected_sort_options: validatedSortOptions,
          group_mode: groupMode
        });
        
      if (insertError) {
        console.error("[saveCollectionFilterPreferences] Error inserting preferences:", insertError);
        throw insertError;
      }
    }
    
    console.log("[saveCollectionFilterPreferences] Successfully saved preferences");
    return true;
  } catch (error) {
    console.error("[saveCollectionFilterPreferences] Error:", error);
    return false;
  }
}

/**
 * Checks if a string is a valid UUID
 * @param id The string to check
 * @returns True if the string is a valid UUID, false otherwise
 */
function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchUserCollectionCountByCountry(userId: string): Promise<Record<string, number>> {
  // Returns a map of country name -> collection item count for user
  try {
    // We'll just fetch all user's collection items and aggregate by country (good enough unless user has MANY thousands)
    const items = await fetchUserCollection(userId);
    const counts: Record<string, number> = {};
    for (const item of items) {
      const country = item.banknote?.country ?? 'Unknown';
      if (!counts[country]) counts[country] = 0;
      counts[country]++;
    }
    return counts;
  } catch (err) {
    console.error("Error in fetchUserCollectionCountByCountry", err);
    return {};
  }
}

export async function addUnlistedBanknoteAndCollectionItem({
  userId,
  country,
  denomination,
  year,
  series,
  pickNumber,
  extPickNumber,
  turkCatalogNumber,
  sultanName,
  type,
  category,
  rarity,
  sealNames,
  faceValue,
  obverseImage,
  reverseImage,
  additionalNotes,
}: {
  userId: string;
  country: string;
  denomination?: string;
  year?: string;
  series?: string;
  pickNumber?: string;
  extPickNumber?: string;
  turkCatalogNumber?: string;
  sultanName?: string;
  type?: string;
  category?: string;
  rarity?: string;
  sealNames?: string;
  faceValue?: string;
  obverseImage?: string;
  reverseImage?: string;
  additionalNotes?: string;
}) {
  // Create in unlisted_banknotes, then add to collection_items
  // minimal required are country, userId, denomination, year
  try {
    const { data: banknote, error } = await supabase
      .from("unlisted_banknotes")
      .insert([
        {
          user_id: userId,
          country: country,
          denomination: denomination ?? "",
          year: year ?? "",
          series: series ?? "",
          pick_number: pickNumber ?? "",
          extended_pick_number: extPickNumber ?? "",
          turk_catalog_number: turkCatalogNumber ?? "",
          sultan_name: sultanName ?? "",
          type: type ?? "",
          category: category ?? "",
          rarity: rarity ?? "",
          seal_names: sealNames ?? "",
          face_value: faceValue ?? denomination ?? "",
          front_picture: obverseImage ?? "",
          back_picture: reverseImage ?? "",
          banknote_description: additionalNotes ?? "",
        },
      ])
      .select("*")
      .single();

    if (error) throw error;

    // Now insert into collection_items
    const { error: ciError } = await supabase
      .from("collection_items")
      .insert([
        {
          user_id: userId,
          unlisted_banknotes_id: banknote.id,
          is_unlisted_banknote: true,
        },
      ]);

    if (ciError) throw ciError;
    return true;
  } catch (e) {
    console.error("[addUnlistedBanknoteAndCollectionItem]:", e);
    throw e;
  }
}

// Utility function for creating an unlisted_banknotes entry and linking it to collection_items
export async function createUnlistedBanknoteWithCollectionItem(params: {
  userId: string;
  country: string;
  extended_pick_number: string;
  pick_number?: string;
  turk_catalog_number?: string;
  face_value: string;
  gregorian_year?: string;
  islamic_year?: string;
  sultan_name?: string;
  printer?: string;
  type?: string;
  category?: string;
  rarity?: string;
  banknote_description?: string;
  historical_description?: string;
  obverse_image?: string;
  reverse_image?: string;
  condition?: string;
  grade_by?: string;
  grade?: string;
  grade_condition_description?: string;
  public_note?: string;
  private_note?: string;
  purchase_price?: number;
  purchase_date?: string;
  location?: string;
  is_for_sale?: boolean;
  sale_price?: number;
  name?: string;
  seal_names?: string;
}): Promise<{ id: string; banknoteId: string } | null> {
  try {
    // Create unlisted banknote
    const { data: banknote, error: banknoteError } = await supabase
      .from('unlisted_banknotes')
      .insert({
        user_id: params.userId,
        country: params.country,
        extended_pick_number: params.extended_pick_number,
        pick_number: params.pick_number,
        turk_catalog_number: params.turk_catalog_number,
        face_value: params.face_value,
        gregorian_year: params.gregorian_year,
        islamic_year: params.islamic_year,
        sultan_name: params.sultan_name,
        printer: params.printer,
        type: params.type,
        category: params.category || 'Unlisted Banknotes',
        rarity: params.rarity,
        banknote_description: params.banknote_description,
        historical_description: params.historical_description,
        name: params.name,
        seal_names: params.seal_names,
      })
      .select()
      .single();

    if (banknoteError) {
      console.error('Error creating unlisted banknote:', banknoteError);
      throw banknoteError;
    }

    // Create collection item
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collection_items')
      .insert({
        user_id: params.userId,
        unlisted_banknotes_id: banknote.id,
        condition: params.condition,
        grade_by: params.grade_by,
        grade: params.grade,
        grade_condition_description: params.grade_condition_description,
        public_note: params.public_note,
        private_note: params.private_note,
        purchase_price: params.purchase_price,
        purchase_date: params.purchase_date,
        location: params.location,
        is_for_sale: params.is_for_sale,
        sale_price: params.sale_price,
        obverse_image: params.obverse_image,
        reverse_image: params.reverse_image,
        is_unlisted_banknote: true,
      })
      .select()
      .single();

    if (collectionError) {
      console.error('Error creating collection item:', collectionError);
      throw collectionError;
    }

    return {
      id: collectionItem.id,
      banknoteId: banknote.id
    };
  } catch (error) {
    console.error('Error in createUnlistedBanknoteWithCollectionItem:', error);
    return null;
  }
}

export async function updateUnlistedBanknoteWithCollectionItem(
  collectionItemId: string,
  params: {
    userId: string;
    country: string;
    extended_pick_number: string;
    pick_number?: string;
    turk_catalog_number?: string;
    face_value: string;
    gregorian_year?: string;
    islamic_year?: string;
    sultan_name?: string;
    printer?: string;
    type?: string;
    category?: string;
    rarity?: string;
    name?: string;
    condition?: string;
    grade_by?: string;
    grade?: string;
    grade_condition_description?: string;
    public_note?: string;
    private_note?: string;
    location?: string;
    purchase_price?: number;
    purchase_date?: string;
    is_for_sale?: boolean;
    sale_price?: number;
    obverse_image?: string;
    reverse_image?: string;
    seal_names?: string;
    prefix?: string;
  }
): Promise<CollectionItem> {
  try {
    // First get the collection item to get the unlisted_banknotes_id
    const { data: existingItem, error: itemError } = await supabase
      .from('collection_items')
      .select('unlisted_banknotes_id')
      .eq('id', collectionItemId)
      .single();

    if (itemError) {
      console.error('Error fetching collection item:', itemError);
      throw itemError;
    }

    if (!existingItem?.unlisted_banknotes_id) {
      throw new Error('No unlisted banknote ID found for this collection item');
    }

    // Update unlisted banknote
    const { error: banknoteError } = await supabase
      .from('unlisted_banknotes')
      .update({
        country: params.country,
        extended_pick_number: params.extended_pick_number,
        pick_number: params.pick_number,
        turk_catalog_number: params.turk_catalog_number,
        face_value: params.face_value,
        gregorian_year: params.gregorian_year,
        islamic_year: params.islamic_year,
        sultan_name: params.sultan_name,
        printer: params.printer,
        category: params.category || 'Unlisted Banknotes',
        rarity: params.rarity,
        name: params.name,
        seal_names: params.seal_names,
      })
      .eq('id', existingItem.unlisted_banknotes_id);

    if (banknoteError) {
      console.error('Error updating unlisted banknote:', banknoteError);
      throw banknoteError;
    }

    // Update collection item
    const { error: collectionError } = await supabase
      .from('collection_items')
      .update({
        condition: params.condition,
        grade_by: params.grade_by,
        grade: params.grade,
        grade_condition_description: params.grade_condition_description,
        public_note: params.public_note,
        private_note: params.private_note,
        purchase_price: params.purchase_price,
        purchase_date: params.purchase_date,
        location: params.location,
        is_for_sale: params.is_for_sale,
        sale_price: params.sale_price,
        obverse_image: params.obverse_image,
        reverse_image: params.reverse_image,
        type: params.type,
        prefix: params.prefix
      })
      .eq('id', collectionItemId);

    if (collectionError) {
      console.error('Error updating collection item:', collectionError);
      throw collectionError;
    }

    // Fetch and return the updated collection item
    return await fetchCollectionItem(collectionItemId) as CollectionItem;
  } catch (error) {
    console.error('Error in updateUnlistedBanknoteWithCollectionItem:', error);
    throw error;
  }
}

export async function createMarketplaceItem(params: {
  collectionItemId: string;
  sellerId: string;
  banknoteId: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .insert([{
        collection_item_id: params.collectionItemId,
        seller_id: params.sellerId,
        status: 'Available',
        banknote_id: params.banknoteId
      }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating marketplace item:', error);
    throw error;
  }
}

export interface UpdateCollectionItemData {
  grade?: string | null;
  gradeNumeric?: number | null;
  gradeProvider?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  purchasePriceCurrency?: string | null;
  seller?: string | null;
  notes?: string | null;
  obverseImage?: string | null;
  reverseImage?: string | null;
  hide_images?: boolean;
}
