import { supabase, TablesInsert, TablesRow } from "@/integrations/supabase/client";
import { BanknoteCondition, CollectionItem } from "@/types";
import { fetchBanknoteById } from "./banknoteService";

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
        return {
          id: item.id,
          userId: item.user_id,
          banknoteId: item.banknote_id,
          banknote: banknote!,
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

    return enrichedItems;
  } catch (error) {
    console.error("Error in fetchUserCollection:", error);
    return [];
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
  userId: string, 
  banknoteId: string, 
  condition: BanknoteCondition,
  purchasePrice?: number,
  purchaseDate?: string,
  publicNote?: string,
  privateNote?: string
): Promise<CollectionItem | null> {
  try {
    console.log("Adding banknote to collection:", { userId, banknoteId, condition });

    // Get current highest order index
    const { data: highestItem } = await supabase
      .from('collection_items')
      .select('order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: false })
      .limit(1);
    
    const orderIndex = highestItem && highestItem.length > 0 ? highestItem[0].order_index + 1 : 0;
    
    const newItem: TablesInsert<'collection_items'> = {
      user_id: userId,
      banknote_id: banknoteId,
      condition: condition,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate,
      public_note: publicNote,
      private_note: privateNote,
      order_index: orderIndex
    };

    const { data: insertedItem, error } = await supabase
      .from('collection_items')
      .insert(newItem)
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
    if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;
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

// Add function to update collection item images
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
