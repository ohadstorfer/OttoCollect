
// This fixes the conversion from the Supabase seller format to the User type in MarketplaceItem
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceItem, UserRank, User } from "@/types";
import { fetchCollectionItem } from "./collectionService";

// Add user type adaptations to fix typescript errors
const adaptSellerToUserType = (seller: { 
  id: string; 
  username: string; 
  rank: string; 
  avatar_url: string | null; 
}): User => {
  return {
    id: seller.id,
    username: seller.username,
    email: "", // Required by User type
    avatarUrl: seller.avatar_url || undefined,
    role_id: "", // Required by User type 
    role: "User", // Default role
    rank: seller.rank as UserRank,
    points: 0, // Default points
    createdAt: new Date().toISOString(), // Default creation date
  };
};

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    console.log("Fetching marketplace items from Supabase");
    
    // Fetch marketplace items with status 'Available'
    const { data: marketplaceItems, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('status', 'Available');
      
    if (error) {
      console.error("Error fetching marketplace items:", error);
      throw error;
    }
    
    console.log(`Found ${marketplaceItems?.length || 0} marketplace items`);
    
    if (!marketplaceItems || marketplaceItems.length === 0) {
      console.log("No marketplace items found");
      return [];
    }
    
    // Process the marketplace items
    const enrichedItems = await Promise.all(
      marketplaceItems.map(async (item) => {
        try {
          console.log(`Processing marketplace item ${item.id}`);
          
          // Get collection item details
          const collectionItem = await fetchCollectionItem(item.collection_item_id);
          if (!collectionItem) {
            console.log(`Collection item not found: ${item.collection_item_id}`);
            return null;
          }
          
          // Verify that the collection item is actually for sale
          if (!collectionItem.isForSale) {
            console.log(`Collection item ${item.collection_item_id} is no longer marked for sale, skipping`);
            return null;
          }
          
          // Get basic seller info
          console.log(`Fetching seller info for user ${item.seller_id}`);
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('id, username, rank, avatar_url')
            .eq('id', item.seller_id)
            .single();
          
          if (sellerError) {
            console.log(`Error fetching seller data: ${sellerError.message}`);
          }
          
          // Fallback seller data if we can't find the profile
          const sellerInfo = sellerData || {
            id: item.seller_id,
            username: "Unknown User",
            rank: "Newbie" as UserRank,
            avatar_url: null
          };
          
          // Convert seller data to User type
          const seller = adaptSellerToUserType(sellerInfo);
          
          console.log(`Successfully processed marketplace item ${item.id}`);
          
          return {
            id: item.id,
            collectionItemId: item.collection_item_id,
            collectionItem: collectionItem,
            sellerId: item.seller_id,
            seller,
            status: item.status,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          } as MarketplaceItem;
        } catch (error) {
          console.error(`Error processing marketplace item ${item.id}:`, error);
          return null;
        }
      })
    );
    
    const validItems = enrichedItems.filter(item => item !== null) as MarketplaceItem[];
    console.log(`Processed ${validItems.length} valid marketplace items`);
    return validItems;
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
    // First, check if the collection item exists and is not already for sale
    const { data: collectionItem, error: fetchError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', collectionItemId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching collection item:", fetchError);
      throw fetchError;
    }
    
    if (!collectionItem) {
      console.error("Collection item not found:", collectionItemId);
      return false;
    }
    
    // Update the collection item to mark as for sale
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
      .select('id, status')
      .eq('collection_item_id', collectionItemId)
      .maybeSingle();
      
    if (existingItem) {
      // Item is already in marketplace, update its status if needed
      if (existingItem.status !== 'Available') {
        const { error } = await supabase
          .from('marketplace_items')
          .update({ status: 'Available' })
          .eq('id', existingItem.id);
          
        if (error) {
          console.error("Error updating existing marketplace item:", error);
          throw error;
        }
      }
      
      return true;
    }
    
    // Add the item to marketplace
    const newItem = {
      collection_item_id: collectionItemId,
      banknote_id: collectionItem.banknote_id,
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
    
    console.log(`Successfully added item ${collectionItemId} to marketplace`);
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
        .update({ status: 'Removed' })
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
          .update({ status: 'Removed' })
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

export async function getMarketplaceItemById(id: string): Promise<MarketplaceItem | null> {
  try {
    console.log(`Fetching marketplace item with ID: ${id}`);
    
    // Get the marketplace item by ID
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error("Error fetching marketplace item by ID:", error);
      return null;
    }
    
    if (!data) {
      console.log(`No marketplace item found with ID: ${id}`);
      return null;
    }
    
    // Get collection item details
    console.log(`Fetching collection item: ${data.collection_item_id}`);
    const collectionItem = await fetchCollectionItem(data.collection_item_id);
    if (!collectionItem) {
      console.log(`Collection item not found: ${data.collection_item_id}`);
      return null;
    }
    
    // Get seller info
    console.log(`Fetching seller info: ${data.seller_id}`);
    const { data: sellerData, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, rank, avatar_url')
      .eq('id', data.seller_id)
      .single();
      
    if (sellerError) {
      console.log(`Error fetching seller data: ${sellerError.message}`);
    }
    
    // Fallback seller data if we can't find the profile
    const sellerInfo = sellerData || {
      id: data.seller_id,
      username: "Unknown User",
      rank: "Newbie" as UserRank,
      avatar_url: null
    };
    
    // Convert seller data to User type
    const seller = adaptSellerToUserType(sellerInfo);
    
    console.log(`Successfully fetched and processed marketplace item ${id}`);
    
    return {
      id: data.id,
      collectionItemId: data.collection_item_id,
      collectionItem: collectionItem,
      sellerId: data.seller_id,
      seller,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as MarketplaceItem;
  } catch (error) {
    console.error("Error in getMarketplaceItemById:", error);
    return null;
  }
}

export async function getMarketplaceItemForCollectionItem(
  collectionItemId: string
): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('collection_item_id', collectionItemId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Get collection item details
    const collectionItem = await fetchCollectionItem(collectionItemId);
    if (!collectionItem) {
      console.log(`Collection item not found: ${collectionItemId}`);
      return null;
    }
    
    // Get seller info
    const { data: sellerData, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, rank, avatar_url')
      .eq('id', data.seller_id)
      .single();
      
    if (sellerError) {
      console.log(`Error fetching seller data: ${sellerError.message}`);
    }
    
    const sellerInfo = sellerData || {
      id: data.seller_id,
      username: "Unknown User",
      rank: "Newbie" as UserRank,
      avatar_url: null
    };
    
    // Convert seller data to User type
    const seller = adaptSellerToUserType(sellerInfo);
    
    return {
      id: data.id,
      collectionItemId: data.collection_item_id,
      collectionItem: collectionItem,
      sellerId: data.seller_id,
      seller,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as MarketplaceItem;
  } catch (error) {
    console.error("Error in getMarketplaceItemForCollectionItem:", error);
    return null;
  }
}

export async function synchronizeMarketplaceWithCollection() {
  try {
    console.log("Starting marketplace synchronization");
    
    // 1. Get all collection items marked for sale
    const { data: forSaleItems, error: collectionError } = await supabase
      .from('collection_items')
      .select('id, user_id, banknote_id')
      .eq('is_for_sale', true);
      
    if (collectionError) {
      console.error("Error fetching for-sale collection items:", collectionError);
      throw collectionError;
    }
    
    console.log(`Found ${forSaleItems?.length || 0} collection items marked for sale`);
    
    // 2. Get all marketplace items
    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, collection_item_id, status')
      .in('status', ['Available', 'Reserved']);
      
    if (marketplaceError) {
      console.error("Error fetching marketplace items:", marketplaceError);
      throw marketplaceError;
    }
    
    // Create maps for easier lookups
    const marketplaceMap = new Map(
      (marketplaceItems || []).map(item => [item.collection_item_id, item])
    );
    
    // 3. Add missing items to marketplace
    let addedCount = 0;
    for (const item of forSaleItems || []) {
      if (!marketplaceMap.has(item.id)) {
        console.log(`Adding item ${item.id} to marketplace`);
        // This item is marked for sale but not in marketplace - add it
        const { error } = await supabase
          .from('marketplace_items')
          .insert({
            banknote_id: item.banknote_id,
            collection_item_id: item.id,
            seller_id: item.user_id,
            status: "Available"
          });
          
        if (error) {
          console.error(`Error adding item ${item.id} to marketplace:`, error);
          continue;
        }
        
        addedCount++;
      }
    }
    
    console.log(`Added ${addedCount} new items to marketplace`);
    return true;
  } catch (error) {
    console.error("Error in synchronizeMarketplaceWithCollection:", error);
    return false;
  }
}
