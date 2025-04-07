import { supabase, TablesInsert } from "@/integrations/supabase/client";
import { MarketplaceItem, UserRank } from "@/types";
import { fetchBanknoteById } from "./banknoteService";

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const { data: marketplaceItems, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item:collection_item_id (*)
      `)
      .eq('status', 'Available');
      
    if (error) {
      console.error("Error fetching marketplace items:", error);
      throw error;
    }
    
    // Process the marketplace items
    const enrichedItems = await Promise.all(
      (marketplaceItems || []).map(async (item) => {
        // Get banknote details for the collection item
        const collectionItem = item.collection_item;
        const banknote = await fetchBanknoteById(collectionItem.banknote_id);
        
        // Get basic seller info
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('id, username, rank')
          .eq('id', item.seller_id)
          .single();
        
        // Fallback seller data if we can't find the profile
        const seller = sellerData || {
          id: item.seller_id,
          username: "Unknown User",
          rank: "Newbie" as UserRank
        };
        
        return {
          id: item.id,
          collectionItemId: item.collection_item_id,
          collectionItem: {
            id: collectionItem.id,
            userId: collectionItem.user_id,
            banknoteId: collectionItem.banknote_id,
            banknote: banknote!,
            condition: collectionItem.condition,
            salePrice: collectionItem.sale_price,
            isForSale: collectionItem.is_for_sale,
            publicNote: collectionItem.public_note,
            privateNote: collectionItem.private_note,
            purchasePrice: collectionItem.purchase_price,
            purchaseDate: collectionItem.purchase_date,
            location: collectionItem.location,
            orderIndex: collectionItem.order_index,
            createdAt: collectionItem.created_at,
            updatedAt: collectionItem.updated_at,
            obverseImage: collectionItem.obverse_image,
            reverseImage: collectionItem.reverse_image,
            personalImages: [
              collectionItem.obverse_image,
              collectionItem.reverse_image
            ].filter(Boolean) as string[]
          },
          sellerId: item.seller_id,
          seller: seller,
          status: item.status,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        } as MarketplaceItem;
      })
    );
    
    return enrichedItems;
  } catch (error) {
    console.error("Error in fetchMarketplaceItems:", error);
    return [];
  }
}

export async function addToMarketplace(
  collectionItemId: string,
  userId: string
): Promise<boolean> {
  try {
    // First, update the collection item to mark as for sale
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId);
      
    if (updateError) {
      console.error("Error updating collection item for marketplace:", updateError);
      throw updateError;
    }
    
    // Check if the item is already in the marketplace
    const { data: existingItem } = await supabase
      .from('marketplace_items')
      .select('id')
      .eq('collection_item_id', collectionItemId)
      .single();
      
    if (existingItem) {
      // Item is already in marketplace, update its status
      const { error } = await supabase
        .from('marketplace_items')
        .update({ status: 'Available' })
        .eq('id', existingItem.id);
        
      if (error) {
        console.error("Error updating existing marketplace item:", error);
        throw error;
      }
      
      return true;
    }
    
    // Add the item to marketplace
    const newItem = {
      collection_item_id: collectionItemId,
      seller_id: userId,
      status: 'Available'
    };
    
    const { error } = await supabase
      .from('marketplace_items')
      .insert(newItem);
      
    if (error) {
      console.error("Error adding to marketplace:", error);
      // Roll back the update to the collection item
      await supabase
        .from('collection_items')
        .update({ is_for_sale: false })
        .eq('id', collectionItemId);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in addToMarketplace:", error);
    return false;
  }
}

export async function removeFromMarketplace(
  collectionItemId: string,
  marketplaceItemId?: string
): Promise<boolean> {
  try {
    // If marketplaceItemId is provided, use it directly
    if (marketplaceItemId) {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', marketplaceItemId);
        
      if (error) {
        console.error("Error removing from marketplace:", error);
        throw error;
      }
    } else {
      // Otherwise, look up the marketplace item by collection_item_id
      const { data: marketplaceItem, error: findError } = await supabase
        .from('marketplace_items')
        .select('id')
        .eq('collection_item_id', collectionItemId)
        .single();
      
      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error finding marketplace item:", findError);
        throw findError;
      }
      
      if (marketplaceItem) {
        const { error } = await supabase
          .from('marketplace_items')
          .delete()
          .eq('id', marketplaceItem.id);
          
        if (error) {
          console.error("Error removing from marketplace:", error);
          throw error;
        }
      }
    }
    
    // Update the collection item to mark as not for sale
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: false })
      .eq('id', collectionItemId);
      
    if (updateError) {
      console.error("Error updating collection item from marketplace:", updateError);
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeFromMarketplace:", error);
    return false;
  }
}

export async function getMarketplaceItemForCollectionItem(
  collectionItemId: string
): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item:collection_item_id (*)
      `)
      .eq('collection_item_id', collectionItemId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Get banknote details
    const collectionItem = data.collection_item;
    const banknote = await fetchBanknoteById(collectionItem.banknote_id);
    
    // Get seller info
    const { data: sellerData } = await supabase
      .from('profiles')
      .select('id, username, rank')
      .eq('id', data.seller_id)
      .single();
      
    const seller = sellerData || {
      id: data.seller_id,
      username: "Unknown User",
      rank: "Newbie" as UserRank
    };
    
    return {
      id: data.id,
      collectionItemId: data.collection_item_id,
      collectionItem: {
        id: collectionItem.id,
        userId: collectionItem.user_id,
        banknoteId: collectionItem.banknote_id,
        banknote: banknote!,
        condition: collectionItem.condition,
        salePrice: collectionItem.sale_price,
        isForSale: collectionItem.is_for_sale,
        publicNote: collectionItem.public_note,
        privateNote: collectionItem.private_note,
        purchasePrice: collectionItem.purchase_price,
        purchaseDate: collectionItem.purchase_date,
        location: collectionItem.location,
        orderIndex: collectionItem.order_index,
        createdAt: collectionItem.created_at,
        updatedAt: collectionItem.updated_at,
        obverseImage: collectionItem.obverse_image,
        reverseImage: collectionItem.reverse_image,
        personalImages: [
          collectionItem.obverse_image,
          collectionItem.reverse_image
        ].filter(Boolean) as string[]
      },
      sellerId: data.seller_id,
      seller: seller,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as MarketplaceItem;
  } catch (error) {
    console.error("Error in getMarketplaceItemForCollectionItem:", error);
    return null;
  }
}
