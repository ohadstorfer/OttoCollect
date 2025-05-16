import { supabase } from "@/integrations/supabase/client";
import { CollectionItem } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { fetchBanknoteById } from "@/services/banknoteService";
import { fetchCountryById } from "@/services/countryService";
import { BanknoteCondition } from "@/types";
import type { Database } from "@/integrations/supabase/types";

// Type definition for collection items table insert
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

export async function uploadCollectionImage(file: File): Promise<string> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error("User not authenticated");

    const userId = user.data.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('banknote_images')
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from('banknote_images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadCollectionImage:", error);
    throw error;
  }
}

export type { CollectionItem };

export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    console.log("[fetchUserCollection] Starting fetch for user:", userId);
    
    const { data: collectionItems, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error("[fetchUserCollection] Error fetching collection:", error);
      throw error;
    }

    console.log(`[fetchUserCollection] Found ${collectionItems?.length || 0} raw collection items for user:`, userId);
    
    if (collectionItems && collectionItems.length > 0) {
      console.log("[fetchUserCollection] Sample raw item:", collectionItems[0]);
    }

    // Fetch banknote details for each collection item
    const enrichedItems = await Promise.all(
      (collectionItems || []).map(async (item) => {
        console.log(`[fetchUserCollection] Fetching banknote details for item ${item.id}, banknote_id: ${item.banknote_id}`);
        const banknote = await fetchBanknoteById(item.banknote_id);
        
        if (!banknote) {
          console.error(`[fetchUserCollection] Banknote not found for collection item: ${item.banknote_id}`);
          return null;
        }
        
        console.log(`[fetchUserCollection] Retrieved banknote details for ${item.banknote_id}:`, {
          country: banknote.country,
          denomination: banknote.denomination,
          year: banknote.year,
          type: banknote.type || "NO_TYPE",
          imageUrls: banknote.imageUrls,
          imageUrlsType: typeof banknote.imageUrls
        });
        
        // Ensure banknote.type is never undefined - default to "Issued note"
        if (!banknote.type) {
          banknote.type = "Issued note";
        }
        
        const enrichedItem = {
          id: item.id,
          userId: item.user_id,
          banknoteId: item.banknote_id,
          banknote: banknote,
          condition: item.condition as BanknoteCondition,
          salePrice: item.sale_price,
          isForSale: item.is_for_sale,
          publicNote: item.public_note,
          privateNote: item.private_note,
          purchasePrice: item.purchase_price,
          purchaseDate: item.purchase_date,
          location: item.location,
          obverseImage: item.obverse_image,
          reverseImage: item.reverse_image,
          orderIndex: item.order_index,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        } as CollectionItem;
        
        console.log(`[fetchUserCollection] Enriched item created for ${item.id}`);
        return enrichedItem;
      })
    );

    // Filter out any null items (where banknote wasn't found)
    const validItems = enrichedItems.filter(item => item !== null) as CollectionItem[];
    console.log(`[fetchUserCollection] Returning ${validItems.length} enriched items after filtering nulls`);
    
    return validItems;
  } catch (error) {
    console.error("[fetchUserCollection] Error in fetchUserCollection:", error);
    return [];
  }
}

export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  // This function replaces fetchUserCollection but with a more accurate name
  return fetchUserCollection(userId);
}

/**
 * Fetches user's collection items filtered by country
 * @param userId The user ID
 * @param countryId The country ID to filter by
 * @returns Collection items for the specified country
 */
export async function fetchUserCollectionByCountry(userId: string, countryId: string): Promise<CollectionItem[]> {
  try {
    console.log("[fetchUserCollectionByCountry] Starting fetch for:", { userId, countryId });
    
    // First get the country data to get the name
    const country = await fetchCountryById(countryId);
    
    if (!country) {
      console.error(`[fetchUserCollectionByCountry] Country not found with ID: ${countryId}`);
      return [];
    }
    
    console.log(`[fetchUserCollectionByCountry] Found country: ${country.name} for ID: ${countryId}`);
    
    // Fetch all user's collection items
    const allCollectionItems = await fetchUserCollection(userId);
    
    if (!allCollectionItems || allCollectionItems.length === 0) {
      console.log("[fetchUserCollectionByCountry] No collection items found for user");
      return [];
    }
    
    console.log(`[fetchUserCollectionByCountry] Got ${allCollectionItems.length} collection items before filtering`);
    
    // Then filter by country name - this is important as the banknotes store country names, not IDs
    const filteredItems = allCollectionItems.filter(item => {
      const matchesCountry = item.banknote && item.banknote.country === country.name;
      
      if (!matchesCountry) {
        console.log(`[fetchUserCollectionByCountry] Item ${item.id} has banknote country "${item.banknote?.country}" which doesn't match "${country.name}"`);
      }
      
      return matchesCountry;
    });
    
    console.log(`[fetchUserCollectionByCountry] Found ${filteredItems.length} items for country ${country.name} (ID: ${countryId})`);
    
    // Log the first item to debug
    if (filteredItems.length > 0) {
      const sampleItem = filteredItems[0];
      console.log("[fetchUserCollectionByCountry] Sample filtered item:", {
        id: sampleItem.id,
        banknoteId: sampleItem.banknoteId,
        banknote: {
          id: sampleItem.banknote?.id,
          country: sampleItem.banknote?.country,
          denomination: sampleItem.banknote?.denomination,
          year: sampleItem.banknote?.year,
          imageUrls: sampleItem.banknote?.imageUrls
        },
        condition: sampleItem.condition,
        images: {
          obverseImage: sampleItem.obverseImage,
          reverseImage: sampleItem.reverseImage
        }
      });
    }
    
    return filteredItems;
  } catch (error) {
    console.error("[fetchUserCollectionByCountry] Error in fetchUserCollectionByCountry:", error);
    return [];
  }
}

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

export async function fetchCollectionItem(itemId: string): Promise<CollectionItem | null> {
  try {
    // First check if the item exists
    const { data: item, error } = await supabase
      .from('collection_items')
      .select(`
        id,
        user_id,
        banknote_id,
        condition,
        sale_price,
        is_for_sale,
        public_note,
        private_note,
        purchase_price,
        purchase_date,
        location,
        obverse_image,
        reverse_image,
        order_index,
        created_at,
        updated_at
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching collection item:", error);
      return null;
    }

    if (!item) {
      console.log(`Collection item not found: ${itemId}`);
      return null;
    }

    // Fetch the banknote details
    const banknote = await fetchBanknoteById(item.banknote_id);
    if (!banknote) {
      console.error(`Banknote not found for collection item: ${item.banknote_id}`);
      return null;
    }
    
    return {
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      banknote: banknote,
      condition: item.condition as BanknoteCondition,
      salePrice: item.sale_price,
      isForSale: item.is_for_sale,
      publicNote: item.public_note,
      privateNote: item.private_note,
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      location: item.location,
      obverseImage: item.obverse_image,
      reverseImage: item.reverse_image,
      orderIndex: item.order_index,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    } as CollectionItem;
  } catch (error) {
    console.error("Error in fetchCollectionItem:", error);
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
      userId: insertedItem.user_id,
      banknoteId: insertedItem.banknote_id,
      banknote: banknote!,
      condition: insertedItem.condition as BanknoteCondition,
      salePrice: insertedItem.sale_price,
      isForSale: insertedItem.is_for_sale,
      publicNote: insertedItem.public_note,
      privateNote: insertedItem.private_note,
      purchasePrice: insertedItem.purchase_price,
      purchaseDate: insertedItem.purchase_date,
      location: insertedItem.location,
      obverseImage: insertedItem.obverse_image,
      reverseImage: insertedItem.reverse_image,
      orderIndex: insertedItem.order_index,
      createdAt: insertedItem.created_at,
      updatedAt: insertedItem.updated_at
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

export async function updateCollectionItem(
  collectionItemId: string, 
  updates: Partial<Omit<CollectionItem, 'id' | 'userId' | 'banknoteId' | 'banknote' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  try {
    // Convert from our frontend model to database model
    const dbUpdates: Partial<TablesInsert<'collection_items'>> = {
      // Explicitly define default properties so TypeScript doesn't complain
      banknote_id: undefined,
      condition: undefined,
      user_id: undefined
    };
    
    if (updates.condition) dbUpdates.condition = updates.condition;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.isForSale !== undefined) dbUpdates.is_for_sale = updates.isForSale;
    if (updates.publicNote !== undefined) dbUpdates.public_note = updates.publicNote;
    if (updates.privateNote !== undefined) dbUpdates.private_note = updates.privateNote;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.purchaseDate !== undefined) {
      // Convert Date object to ISO string if it's a Date
      dbUpdates.purchase_date = typeof updates.purchaseDate === 'string' 
        ? updates.purchaseDate 
        : updates.purchaseDate.toISOString();
    }
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.obverseImage !== undefined) dbUpdates.obverse_image = updates.obverseImage;
    if (updates.reverseImage !== undefined) dbUpdates.reverse_image = updates.reverseImage;
    if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;
    
    // Remove undefined fields
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
        delete dbUpdates[key as keyof typeof dbUpdates];
      }
    });
    
    const { error } = await supabase
      .from('collection_items')
      .update(dbUpdates)
      .eq('id', collectionItemId);
    
    if (error) {
      console.error("Error updating collection item:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateCollectionItem:", error);
    return false;
  }
}

export async function updateCollectionItemImages(
  collectionItemId: string,
  obverseImage?: string,
  reverseImage?: string
): Promise<boolean> {
  try {
    const updates: any = {};
    if (obverseImage !== undefined) updates.obverse_image = obverseImage;
    if (reverseImage !== undefined) updates.reverse_image = reverseImage;
    
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
