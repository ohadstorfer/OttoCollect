
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceItem } from '@/types';

/**
 * Get marketplace item by id
 */
export const getMarketplaceItemById = async (id: string): Promise<MarketplaceItem | null> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        status,
        created_at,
        seller_id,
        collection_item_id,
        collection_items (
          id,
          user_id,
          banknote_id,
          condition,
          sale_price,
          public_note,
          private_note,
          is_for_sale,
          order_index,
          created_at,
          updated_at,
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
      updatedAt: data.created_at,
      sellerId: data.seller_id,
      collectionItemId: data.collection_item_id,
      collectionItem: {
        id: data.collection_items.id,
        userId: data.collection_items.user_id,
        banknoteId: data.collection_items.banknote_id,
        condition: data.collection_items.condition,
        salePrice: data.collection_items.sale_price,
        publicNote: data.collection_items.public_note,
        privateNote: data.collection_items.private_note,
        isForSale: data.collection_items.is_for_sale,
        orderIndex: data.collection_items.order_index,
        createdAt: data.collection_items.created_at,
        updatedAt: data.collection_items.updated_at,
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
 * Fetch all marketplace items
 */
export const fetchMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        seller_id,
        collection_item_id,
        collection_items (
          id,
          user_id,
          banknote_id,
          condition,
          sale_price,
          public_note,
          private_note,
          is_for_sale,
          order_index,
          created_at,
          updated_at,
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
      .eq('status', 'Available')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }

    // Map the data to our MarketplaceItem type
    return data.map(item => ({
      id: item.id,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      sellerId: item.seller_id,
      collectionItemId: item.collection_item_id,
      collectionItem: {
        id: item.collection_items.id,
        userId: item.collection_items.user_id,
        banknoteId: item.collection_items.banknote_id,
        condition: item.collection_items.condition,
        salePrice: item.collection_items.sale_price,
        publicNote: item.collection_items.public_note,
        privateNote: item.collection_items.private_note,
        isForSale: item.collection_items.is_for_sale,
        orderIndex: item.collection_items.order_index,
        createdAt: item.collection_items.created_at,
        updatedAt: item.collection_items.updated_at,
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
 * Add an item to the marketplace
 */
export const addToMarketplace = async (collectionItemId: string): Promise<{ success: boolean; error?: string; itemId?: string }> => {
  try {
    // First, get the collection item to make sure it's valid
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', collectionItemId)
      .single();

    if (collectionError || !collectionItem) {
      return { 
        success: false, 
        error: collectionError ? collectionError.message : 'Collection item not found' 
      };
    }

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Make sure the user owns the collection item
    if (collectionItem.user_id !== user.id) {
      return { success: false, error: 'You do not own this collection item' };
    }

    // Create a new marketplace item
    const { data, error } = await supabase
      .from('marketplace_items')
      .insert({
        collection_item_id: collectionItemId,
        seller_id: user.id,
        status: 'Available',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update the collection item to mark it as for sale
    await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId);

    return { 
      success: true,
      itemId: data.id
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Remove an item from the marketplace
 */
export const removeFromMarketplace = async (marketplaceItemId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // First, get the marketplace item to check ownership
    const { data: marketplaceItem, error: fetchError } = await supabase
      .from('marketplace_items')
      .select('seller_id, collection_item_id')
      .eq('id', marketplaceItemId)
      .single();

    if (fetchError || !marketplaceItem) {
      return { 
        success: false, 
        error: fetchError ? fetchError.message : 'Marketplace item not found' 
      };
    }

    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Make sure the user is the seller
    if (marketplaceItem.seller_id !== user.id) {
      return { success: false, error: 'You are not the seller of this item' };
    }

    // Remove from marketplace
    const { error: deleteError } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', marketplaceItemId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Update the collection item to mark it as not for sale
    await supabase
      .from('collection_items')
      .update({ is_for_sale: false })
      .eq('id', marketplaceItem.collection_item_id);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Synchronize marketplace items with collection
 * This is used to ensure all collection items marked as for sale have a corresponding marketplace item
 */
export const synchronizeMarketplaceWithCollection = async (): Promise<void> => {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('User not authenticated');
      return;
    }

    // Get all collection items that are marked for sale
    const { data: forSaleItems, error: collectionError } = await supabase
      .from('collection_items')
      .select('id, is_for_sale')
      .eq('user_id', user.id)
      .eq('is_for_sale', true);

    if (collectionError) {
      console.error('Error fetching for sale items:', collectionError);
      return;
    }

    // Get all marketplace items for this user
    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, collection_item_id')
      .eq('seller_id', user.id);

    if (marketplaceError) {
      console.error('Error fetching marketplace items:', marketplaceError);
      return;
    }

    // Create a map of collection item IDs that are already in the marketplace
    const marketplaceMap = new Map(
      marketplaceItems?.map(item => [item.collection_item_id, item.id]) || []
    );

    // For each for-sale item that's not in the marketplace, add it
    for (const item of forSaleItems || []) {
      if (!marketplaceMap.has(item.id)) {
        await addToMarketplace(item.id);
      }
    }

    console.log('Marketplace synchronized with collection');
  } catch (err) {
    console.error('Error synchronizing marketplace:', err);
  }
};
