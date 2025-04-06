
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
            personalImages: collectionItem.personal_images || [],
            orderIndex: collectionItem.order_index,
            createdAt: collectionItem.created_at,
            updatedAt: collectionItem.updated_at
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
  marketplaceItemId: string,
  collectionItemId: string
): Promise<boolean> {
  try {
    // First, remove from marketplace
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', marketplaceItemId);
      
    if (error) {
      console.error("Error removing from marketplace:", error);
      throw error;
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
