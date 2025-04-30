import { supabase } from "@/integrations/supabase/client";
import { CollectionItem } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { fetchBanknoteById } from "@/services/banknoteService";
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
    console.log("Fetching collection for user:", userId);
    
    const { data: collectionItems, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error("Error fetching collection:", error);
      throw error;
    }

    console.log(`Found ${collectionItems?.length || 0} collection items for user:`, userId);

    // Fetch banknote details for each collection item
    const enrichedItems = await Promise.all(
      (collectionItems || []).map(async (item) => {
        const banknote = await fetchBanknoteById(item.banknote_id);
        
        if (!banknote) {
          console.error(`Banknote not found for collection item: ${item.banknote_id}`);
          return null;
        }
        
        // Ensure banknote.type is never undefined - default to "Issued note"
        if (!banknote.type) {
          banknote.type = "Issued note";
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
      })
    );

    // Filter out any null items (where banknote wasn't found)
    return enrichedItems.filter(item => item !== null) as CollectionItem[];
  } catch (error) {
    console.error("Error in fetchUserCollection:", error);
    return [];
  }
}

export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  // This function replaces fetchUserCollection but with a more accurate name
  return fetchUserCollection(userId);
}

export async function fetchUserCollectionCountries(userId: string): Promise<{ id: string; name: string; imageUrl: string | null; itemCount: number }[]> {
  try {
    console.log("Fetching collection countries for user:", userId);
    
    // Get all collection items for the user
    const { data: collectionItems, error } = await supabase
      .from('collection_items')
      .select(`
        banknote_id,
        detailed_banknotes!inner(country, front_picture)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("Error fetching collection items:", error);
      throw error;
    }

    // Group by country and count items
    const countryCounts: Record<string, { count: number; imageUrl: string | null }> = {};
    
    collectionItems?.forEach(item => {
      const country = item.detailed_banknotes?.country;
      if (country) {
        if (!countryCounts[country]) {
          countryCounts[country] = { 
            count: 0, 
            imageUrl: item.detailed_banknotes.front_picture || null 
          };
        }
        countryCounts[country].count++;
      }
    });
    
    // Fetch country details from the countries table
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, name, image_url');
      
    if (countriesError) {
      console.error("Error fetching countries:", countriesError);
      throw countriesError;
    }
    
    // Map countries with item counts
    const result = countries
      ?.filter(country => countryCounts[country.name])
      .map(country => ({
        id: country.id,
        name: country.name,
        imageUrl: country.image_url || countryCounts[country.name]?.imageUrl || null,
        itemCount: countryCounts[country.name]?.count || 0
      }))
      .sort((a, b) => b.itemCount - a.itemCount);
      
    return result || [];
  } catch (error) {
    console.error("Error in fetchUserCollectionCountries:", error);
    return [];
  }
}

export async function fetchUserCollectionItemsByCountry(userId: string, countryId: string): Promise<CollectionItem[]> {
  try {
    console.log(`Fetching collection items for user ${userId} and country ${countryId}`);
    
    // First get the country name
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
      
    if (countryError) {
      console.error("Error fetching country:", countryError);
      throw countryError;
    }
    
    if (!country) {
      console.error(`Country with ID ${countryId} not found`);
      return [];
    }
    
    // Get collection items that have banknotes from this country
    const { data: collectionItems, error } = await supabase
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
        updated_at,
        detailed_banknotes!inner(*)
      `)
      .eq('user_id', userId)
      .eq('detailed_banknotes.country', country.name);

    if (error) {
      console.error("Error fetching collection items by country:", error);
      throw error;
    }

    // Transform the results to match the CollectionItem interface
    const enrichedItems = (collectionItems || []).map(item => {
      return {
        id: item.id,
        userId: item.user_id,
        banknoteId: item.banknote_id,
        banknote: {
          id: item.banknote_id,
          catalogId: item.detailed_banknotes.extended_pick_number || '',
          country: item.detailed_banknotes.country || '',
          denomination: item.detailed_banknotes.face_value || '',
          year: item.detailed_banknotes.gregorian_year || '',
          series: '',
          description: item.detailed_banknotes.banknote_description || '',
          obverseDescription: '',
          reverseDescription: '',
          imageUrls: [
            item.detailed_banknotes.front_picture,
            item.detailed_banknotes.back_picture
          ].filter(Boolean) as string[],
          isApproved: item.detailed_banknotes.is_approved || false,
          isPending: item.detailed_banknotes.is_pending || false,
          createdAt: item.detailed_banknotes.created_at || '',
          updatedAt: item.detailed_banknotes.updated_at || '',
          type: item.detailed_banknotes.type || 'Issued note',
          sultanName: item.detailed_banknotes.sultan_name || '',
          extendedPickNumber: item.detailed_banknotes.extended_pick_number || '',
          category: item.detailed_banknotes.category || '',
          // Additional fields from detailed banknote
          pickNumber: item.detailed_banknotes.pick_number || '',
          turkCatalogNumber: item.detailed_banknotes.turk_catalog_number || '',
          rarity: item.detailed_banknotes.rarity || '',
          printer: item.detailed_banknotes.printer || '',
          watermark: '',
          signatures: [],
          colors: [],
          securityFeatures: [],
          islamicYear: item.detailed_banknotes.islamic_year || '',
          gregorianYear: item.detailed_banknotes.gregorian_year || '',
          banknoteDescription: item.detailed_banknotes.banknote_description || '',
          historicalDescription: item.detailed_banknotes.historical_description || '',
        },
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
    });

    return enrichedItems;
  } catch (error) {
    console.error("Error in fetchUserCollectionItemsByCountry:", error);
    return [];
  }
}

export async function fetchBanknoteCategoriesAndTypes(items: CollectionItem[]): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> {
  try {
    // Extract unique categories and types from collection items
    const categoriesMap = new Map<string, { id: string; name: string; count: number }>();
    const typesMap = new Map<string, { id: string; name: string; count: number }>();
    
    // Process each item to count categories and types
    items.forEach(item => {
      if (item.banknote?.category) {
        const categoryId = item.banknote.category;
        const categoryName = item.banknote.category; // Using category name as ID for now
        
        if (categoriesMap.has(categoryId)) {
          const category = categoriesMap.get(categoryId)!;
          category.count++;
          categoriesMap.set(categoryId, category);
        } else {
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            count: 1
          });
        }
      }
      
      if (item.banknote?.type) {
        const typeId = item.banknote.type;
        const typeName = item.banknote.type; // Using type name as ID for now
        
        if (typesMap.has(typeId)) {
          const type = typesMap.get(typeId)!;
          type.count++;
          typesMap.set(typeId, type);
        } else {
          typesMap.set(typeId, {
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
    
    return { categories, types };
  } catch (error) {
    console.error("Error extracting categories and types:", error);
    return { categories: [], types: [] };
  }
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
    condition: BanknoteCondition;
    purchasePrice?: number;
    purchaseDate?: string;
    publicNote?: string;
    privateNote?: string;
    salePrice?: number;
    isForSale?: boolean;
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
      condition: params.condition,
      purchase_price: params.purchasePrice || null,
      purchase_date: params.purchaseDate || null,
      public_note: params.publicNote || null,
      private_note: params.privateNote || null,
      order_index: orderIndex,
      is_for_sale: params.isForSale || false,
      sale_price: params.salePrice || null
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
