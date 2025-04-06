
import { supabase, TablesInsert, TablesRow } from "@/integrations/supabase/client";
import { CollectionItem, MarketplaceItem } from "@/types";
import { fetchUserCollection } from "./collectionService";

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    console.log("Fetching marketplace items");
    
    const { data: marketItems, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        seller:seller_id (id, username, rank)
      `)
      .eq('status', 'Available');

    if (error) {
      console.error("Error fetching marketplace items:", error);
      throw error;
    }

    console.log(`Found ${marketItems?.length || 0} marketplace items`);

    // Get all seller IDs to fetch their collection items
    const sellerIds = marketItems?.map(item => item.seller_id) || [];
    const collectionItemIds = marketItems?.map(item => item.collection_item_id) || [];
    
    // Create a map of collection items
    const collectionItemsMap: { [key: string]: CollectionItem } = {};
    
    for (const sellerId of [...new Set(sellerIds)]) {
      const items = await fetchUserCollection(sellerId);
      items.forEach(item => {
        if (collectionItemIds.includes(item.id)) {
          collectionItemsMap[item.id] = item;
        }
      });
    }

    // Map to MarketplaceItem structure
    const enrichedItems = marketItems?.map(item => {
      const seller = item.seller as { id: string; username: string; rank: string };
      
      return {
        id: item.id,
        collectionItemId: item.collection_item_id,
        collectionItem: collectionItemsMap[item.collection_item_id],
        sellerId: item.seller_id,
        seller: {
          id: seller.id,
          username: seller.username,
          rank: seller.rank
        },
        status: item.status as 'Available' | 'Reserved' | 'Sold',
        createdAt: item.created_at,
        updatedAt: item.updated_at
      } as MarketplaceItem;
    }) || [];

    return enrichedItems.filter(item => item.collectionItem !== undefined);
  } catch (error) {
    console.error("Error in fetchMarketplaceItems:", error);
    return [];
  }
}

export async function listItemForSale(collectionItemId: string, userId: string): Promise<MarketplaceItem | null> {
  try {
    console.log("Listing item for sale:", { collectionItemId, userId });
    
    // First update the collection item to mark it for sale
    const { error: collectionError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId)
      .eq('user_id', userId);
    
    if (collectionError) {
      console.error("Error updating collection item for sale:", collectionError);
      throw collectionError;
    }
    
    // Then create the marketplace listing
    const newItem: TablesInsert<'marketplace_items'> = {
      collection_item_id: collectionItemId,
      seller_id: userId,
      status: 'Available'
    };

    const { data: insertedItem, error } = await supabase
      .from('marketplace_items')
      .insert(newItem)
      .select(`
        *,
        seller:seller_id (id, username, rank)
      `)
      .single();
    
    if (error) {
      console.error("Error creating marketplace listing:", error);
      throw error;
    }

    // Fetch the collection item details
    const userCollection = await fetchUserCollection(userId);
    const collectionItem = userCollection.find(item => item.id === collectionItemId);
    
    if (!collectionItem) {
      console.error("Collection item not found:", collectionItemId);
      return null;
    }
    
    const seller = insertedItem.seller as { id: string; username: string; rank: string };
    
    const marketplaceItem: MarketplaceItem = {
      id: insertedItem.id,
      collectionItemId: insertedItem.collection_item_id,
      collectionItem,
      sellerId: insertedItem.seller_id,
      seller: {
        id: seller.id,
        username: seller.username,
        rank: seller.rank
      },
      status: insertedItem.status as 'Available' | 'Reserved' | 'Sold',
      createdAt: insertedItem.created_at,
      updatedAt: insertedItem.updated_at
    };

    return marketplaceItem;
  } catch (error) {
    console.error("Error in listItemForSale:", error);
    return null;
  }
}

export async function removeItemFromSale(collectionItemId: string, userId: string): Promise<boolean> {
  try {
    console.log("Removing item from sale:", { collectionItemId, userId });
    
    // First update the collection item to unmark it for sale
    const { error: collectionError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: false })
      .eq('id', collectionItemId)
      .eq('user_id', userId);
    
    if (collectionError) {
      console.error("Error updating collection item to remove from sale:", collectionError);
      throw collectionError;
    }
    
    // Then delete the marketplace listing
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('collection_item_id', collectionItemId)
      .eq('seller_id', userId);
    
    if (error) {
      console.error("Error removing marketplace listing:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeItemFromSale:", error);
    return false;
  }
}
