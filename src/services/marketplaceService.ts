
import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, MarketplaceItem } from "@/types";

/**
 * Fetch marketplace items
 */
export const fetchMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
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
      status: item.status,
      createdAt: item.created_at,
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
