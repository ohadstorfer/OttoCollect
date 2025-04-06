
import { supabase } from "@/integrations/supabase/client";
import { BanknoteCondition, CollectionItem } from "@/types";
import { fetchBanknoteById } from "./banknoteService";

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
          personalImages: item.personal_images,
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
    
    const { data: newItem, error } = await supabase
      .from('collection_items')
      .insert({
        user_id: userId,
        banknote_id: banknoteId,
        condition: condition,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate,
        public_note: publicNote,
        private_note: privateNote,
        order_index: orderIndex
      })
      .select('*')
      .single();
    
    if (error) {
      console.error("Error adding to collection:", error);
      throw error;
    }

    // Fetch the banknote details
    const banknote = await fetchBanknoteById(newItem.banknote_id);
    
    const collectionItem: CollectionItem = {
      id: newItem.id,
      userId: newItem.user_id,
      banknoteId: newItem.banknote_id,
      banknote: banknote!,
      condition: newItem.condition as BanknoteCondition,
      salePrice: newItem.sale_price,
      isForSale: newItem.is_for_sale,
      publicNote: newItem.public_note,
      privateNote: newItem.private_note,
      purchasePrice: newItem.purchase_price,
      purchaseDate: newItem.purchase_date,
      location: newItem.location,
      personalImages: newItem.personal_images,
      orderIndex: newItem.order_index,
      createdAt: newItem.created_at,
      updatedAt: newItem.updated_at
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
    const dbUpdates: any = {};
    
    if (updates.condition) dbUpdates.condition = updates.condition;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.isForSale !== undefined) dbUpdates.is_for_sale = updates.isForSale;
    if (updates.publicNote !== undefined) dbUpdates.public_note = updates.publicNote;
    if (updates.privateNote !== undefined) dbUpdates.private_note = updates.privateNote;
    if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
    if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.personalImages !== undefined) dbUpdates.personal_images = updates.personalImages;
    if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;
    
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
