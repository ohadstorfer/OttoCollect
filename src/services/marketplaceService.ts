
import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, MarketplaceItem } from "@/types";

/**
 * Fetch marketplace items
 */
export const fetchMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        status,
        created_at,
        collection_item_id,
        collection_items (
          id,
          banknote_id,
          condition,
          sale_price,
          public_note,
          obverse_image,
          reverse_image,
          detailed_banknotes (*)
        ),
        profiles (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('status', 'Available');

    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }

    // Map the data to our MarketplaceItem type
    return (data || []).map(item => ({
      id: item.id,
      collectionItemId: item.collection_item_id,
      sellerId: item.profiles.id,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.created_at, // Using created_at as a fallback for updatedAt
      collectionItem: {
        id: item.collection_items.id,
        banknoteId: item.collection_items.banknote_id,
        condition: item.collection_items.condition,
        salePrice: item.collection_items.sale_price,
        publicNote: item.collection_items.public_note,
        obverseImage: item.collection_items.obverse_image,
        reverseImage: item.collection_items.reverse_image,
        banknote: item.collection_items.detailed_banknotes
      },
      seller: {
        id: item.profiles.id,
        username: item.profiles.username,
        avatarUrl: item.profiles.avatar_url,
        rank: item.profiles.rank
      }
    }));
  } catch (err) {
    console.error('Error in fetchMarketplaceItems:', err);
    return [];
  }
};

/**
 * Get marketplace item by id
 */
export const getMarketplaceItemById = async (id: string): Promise<MarketplaceItem | null> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        id,
        status,
        created_at,
        collection_item_id,
        collection_items (
          id,
          banknote_id,
          condition,
          sale_price,
          public_note,
          private_note,
          obverse_image,
          reverse_image,
          detailed_banknotes (*)
        ),
        profiles (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching marketplace item:', error);
      return null;
    }

    if (!data) return null;

    // Map the data to our MarketplaceItem type
    return {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
      collectionItem: {
        id: data.collection_items.id,
        banknoteId: data.collection_items.banknote_id,
        condition: data.collection_items.condition,
        salePrice: data.collection_items.sale_price,
        publicNote: data.collection_items.public_note,
        privateNote: data.collection_items.private_note,
        obverseImage: data.collection_items.obverse_image,
        reverseImage: data.collection_items.reverse_image,
        banknote: data.collection_items.detailed_banknotes
      },
      seller: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };
  } catch (err) {
    console.error('Error in getMarketplaceItemById:', err);
    return null;
  }
};

/**
 * Remove an item from the marketplace
 */
export const removeFromMarketplace = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error removing item from marketplace:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in removeFromMarketplace:', err);
    return false;
  }
};

/**
 * Add an item to the marketplace
 * @param collectionItemId The ID of the collection item to add to the marketplace
 * @param userId The ID of the user who owns the collection item
 */
export const addToMarketplace = async (collectionItemId: string, userId: string): Promise<boolean> => {
  try {
    // Check if the item already exists in the marketplace
    const { data: existingItem, error: checkError } = await supabase
      .from('marketplace_listings')
      .select('id')
      .eq('collection_item_id', collectionItemId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error checking marketplace listing:', checkError);
      return false;
    }

    // If the item already exists, return true
    if (existingItem) {
      // Update the status to Available if it was previously removed
      const { error: updateError } = await supabase
        .from('marketplace_listings')
        .update({ status: 'Available' })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating marketplace listing status:', updateError);
        return false;
      }

      return true;
    }

    // Otherwise, create a new marketplace listing
    const { error: insertError } = await supabase
      .from('marketplace_listings')
      .insert([
        {
          collection_item_id: collectionItemId,
          user_id: userId,
          status: 'Available',
        }
      ]);

    if (insertError) {
      console.error('Error adding item to marketplace:', insertError);
      return false;
    }

    // Update the collection item to mark it as for sale
    const { error: updateItemError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId);

    if (updateItemError) {
      console.error('Error updating collection item:', updateItemError);
      // Don't return false here, as the marketplace entry was created successfully
    }

    return true;
  } catch (err) {
    console.error('Error in addToMarketplace:', err);
    return false;
  }
};

/**
 * Synchronize marketplace with collection items
 * This ensures that all items marked as for sale have a corresponding marketplace listing
 */
export const synchronizeMarketplaceWithCollection = async (): Promise<boolean> => {
  try {
    // Find all collection items marked as for sale
    const { data: forSaleItems, error: forSaleError } = await supabase
      .from('collection_items')
      .select('id, user_id')
      .eq('is_for_sale', true);

    if (forSaleError) {
      console.error('Error fetching for sale items:', forSaleError);
      return false;
    }

    if (!forSaleItems || forSaleItems.length === 0) {
      return true; // No items to synchronize
    }

    // For each item, check if it has a marketplace listing
    for (const item of forSaleItems) {
      const { data: listingExists, error: checkError } = await supabase
        .from('marketplace_listings')
        .select('id')
        .eq('collection_item_id', item.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking marketplace listing:', checkError);
        continue;
      }

      // If no listing exists, create one
      if (!listingExists) {
        const { error: insertError } = await supabase
          .from('marketplace_listings')
          .insert([
            {
              collection_item_id: item.id,
              user_id: item.user_id,
              status: 'Available',
            }
          ]);

        if (insertError) {
          console.error('Error creating marketplace listing:', insertError);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Error in synchronizeMarketplaceWithCollection:', err);
    return false;
  }
};
