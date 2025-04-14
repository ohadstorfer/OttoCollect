
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceItem } from '@/types';

/**
 * Get marketplace item by id
 */
export const getMarketplaceItemById = async (id: string): Promise<MarketplaceItem | null> => {
  try {
    // First, get the marketplace item
    const { data: marketplaceItem, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, status, created_at, updated_at, seller_id, collection_item_id')
      .eq('id', id)
      .single();

    if (marketplaceError || !marketplaceItem) {
      console.error('Error fetching marketplace item:', marketplaceError);
      return null;
    }

    // Get the collection item
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
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
      `)
      .eq('id', marketplaceItem.collection_item_id)
      .single();

    if (collectionError || !collectionItem) {
      console.error('Error fetching collection item:', collectionError);
      return null;
    }

    // Get the seller profile
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', marketplaceItem.seller_id)
      .single();

    if (sellerError || !seller) {
      console.error('Error fetching seller profile:', sellerError);
      return null;
    }

    // Map the data to our MarketplaceItem type
    return {
      id: marketplaceItem.id,
      status: marketplaceItem.status,
      createdAt: marketplaceItem.created_at,
      updatedAt: marketplaceItem.updated_at,
      sellerId: marketplaceItem.seller_id,
      collectionItemId: marketplaceItem.collection_item_id,
      collectionItem: {
        id: collectionItem.id,
        userId: collectionItem.user_id,
        banknoteId: collectionItem.banknote_id,
        condition: collectionItem.condition,
        salePrice: collectionItem.sale_price,
        publicNote: collectionItem.public_note,
        privateNote: collectionItem.private_note,
        isForSale: collectionItem.is_for_sale,
        orderIndex: collectionItem.order_index,
        createdAt: collectionItem.created_at,
        updatedAt: collectionItem.updated_at,
        obverseImage: collectionItem.obverse_image,
        reverseImage: collectionItem.reverse_image,
        banknote: collectionItem.detailed_banknotes
      },
      seller: {
        id: seller.id,
        username: seller.username,
        avatarUrl: seller.avatar_url,
        rank: seller.rank
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
    // First, get all marketplace items
    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, status, created_at, updated_at, seller_id, collection_item_id')
      .eq('status', 'Available')
      .order('created_at', { ascending: false });

    if (marketplaceError) {
      console.error('Error fetching marketplace items:', marketplaceError);
      return [];
    }

    if (!marketplaceItems || marketplaceItems.length === 0) {
      return [];
    }

    // Build an array of promises to get collection items and seller profiles
    const itemPromises = marketplaceItems.map(async (item) => {
      // Get the collection item
      const { data: collectionItem, error: collectionError } = await supabase
        .from('collection_items')
        .select(`
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
        `)
        .eq('id', item.collection_item_id)
        .single();

      if (collectionError || !collectionItem) {
        console.error('Error fetching collection item:', collectionError);
        return null;
      }

      // Get the seller profile
      const { data: seller, error: sellerError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rank')
        .eq('id', item.seller_id)
        .single();

      if (sellerError || !seller) {
        console.error('Error fetching seller profile:', sellerError);
        return null;
      }

      // Map the data to our MarketplaceItem type
      return {
        id: item.id,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        sellerId: item.seller_id,
        collectionItemId: item.collection_item_id,
        collectionItem: {
          id: collectionItem.id,
          userId: collectionItem.user_id,
          banknoteId: collectionItem.banknote_id,
          condition: collectionItem.condition,
          salePrice: collectionItem.sale_price,
          publicNote: collectionItem.public_note,
          privateNote: collectionItem.private_note,
          isForSale: collectionItem.is_for_sale,
          orderIndex: collectionItem.order_index,
          createdAt: collectionItem.created_at,
          updatedAt: collectionItem.updated_at,
          obverseImage: collectionItem.obverse_image,
          reverseImage: collectionItem.reverse_image,
          banknote: collectionItem.detailed_banknotes
        },
        seller: {
          id: seller.id,
          username: seller.username,
          avatarUrl: seller.avatar_url,
          rank: seller.rank
        }
      };
    });

    // Execute all promises and filter out any nulls
    const results = await Promise.all(itemPromises);
    return results.filter((item): item is MarketplaceItem => item !== null);
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
