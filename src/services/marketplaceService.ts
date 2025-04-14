
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceItem } from '@/types';

/**
 * Get marketplace item by id
 */
export const getMarketplaceItemById = async (id: string): Promise<MarketplaceItem | null> => {
  console.log('Starting getMarketplaceItemById with id:', id);
  try {
    // First, get the marketplace item
    console.log('Fetching marketplace item with id:', id);
    const { data: marketplaceItem, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, status, created_at, updated_at, seller_id, collection_item_id')
      .eq('id', id)
      .single();

    if (marketplaceError) {
      console.error('Error fetching marketplace item:', marketplaceError);
      return null;
    }

    if (!marketplaceItem) {
      console.log('No marketplace item found with id:', id);
      return null;
    }
    
    console.log('Successfully fetched marketplace item:', marketplaceItem);

    // Get the collection item
    console.log('Fetching collection item with id:', marketplaceItem.collection_item_id);
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

    if (collectionError) {
      console.error('Error fetching collection item:', collectionError);
      return null;
    }

    if (!collectionItem) {
      console.log('No collection item found with id:', marketplaceItem.collection_item_id);
      return null;
    }
    
    console.log('Successfully fetched collection item:', collectionItem);

    // Get the seller profile
    console.log('Fetching seller profile with id:', marketplaceItem.seller_id);
    const { data: seller, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank')
      .eq('id', marketplaceItem.seller_id)
      .single();

    if (sellerError) {
      console.error('Error fetching seller profile:', sellerError);
      return null;
    }

    if (!seller) {
      console.log('No seller profile found with id:', marketplaceItem.seller_id);
      return null;
    }
    
    console.log('Successfully fetched seller profile:', seller);

    // Map the data to our MarketplaceItem type
    const result = {
      id: marketplaceItem.id,
      status: marketplaceItem.status as "Available" | "Sold" | "Reserved",
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
    
    console.log('Successfully mapped marketplace item data:', result);
    return result;
  } catch (err) {
    console.error('Error in getMarketplaceItemById:', err);
    return null;
  }
};

/**
 * Fetch all marketplace items
 */
export const fetchMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
  console.log('Starting fetchMarketplaceItems');
  try {
    // First, get all marketplace items
    console.log('Fetching all available marketplace items');
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
      console.log('No marketplace items found or empty array returned');
      return [];
    }
    
    console.log(`Successfully fetched ${marketplaceItems.length} marketplace items`);

    // Build an array of promises to get collection items and seller profiles
    console.log('Building promises for fetching collection items and seller profiles');
    const itemPromises = marketplaceItems.map(async (item) => {
      console.log(`Processing marketplace item: ${item.id}`);
      
      // Get the collection item
      console.log(`Fetching collection item with id: ${item.collection_item_id}`);
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

      if (collectionError) {
        console.error(`Error fetching collection item ${item.collection_item_id}:`, collectionError);
        return null;
      }

      if (!collectionItem) {
        console.log(`No collection item found with id: ${item.collection_item_id}`);
        return null;
      }
      
      console.log(`Successfully fetched collection item: ${collectionItem.id}`);

      // Get the seller profile
      console.log(`Fetching seller profile with id: ${item.seller_id}`);
      const { data: seller, error: sellerError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rank')
        .eq('id', item.seller_id)
        .single();

      if (sellerError) {
        console.error(`Error fetching seller profile ${item.seller_id}:`, sellerError);
        return null;
      }

      if (!seller) {
        console.log(`No seller profile found with id: ${item.seller_id}`);
        return null;
      }
      
      console.log(`Successfully fetched seller profile: ${seller.username}`);

      // Map the data to our MarketplaceItem type
      const mappedItem = {
        id: item.id,
        status: item.status as "Available" | "Sold" | "Reserved",
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
      
      console.log(`Successfully mapped marketplace item: ${mappedItem.id}`);
      return mappedItem;
    });

    // Execute all promises and filter out any nulls
    console.log('Executing all promises to fetch item details');
    const results = await Promise.all(itemPromises);
    const filteredResults = results.filter((item): item is MarketplaceItem => item !== null);
    
    console.log(`Successfully processed ${filteredResults.length} marketplace items`);
    return filteredResults;
  } catch (err) {
    console.error('Error in fetchMarketplaceItems:', err);
    return [];
  }
};

/**
 * Add an item to the marketplace
 */
export const addToMarketplace = async (collectionItemId: string): Promise<{ success: boolean; error?: string; itemId?: string }> => {
  console.log('Starting addToMarketplace with collectionItemId:', collectionItemId);
  try {
    // First, get the collection item to make sure it's valid
    console.log('Checking if collection item exists');
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', collectionItemId)
      .single();

    if (collectionError || !collectionItem) {
      console.error('Collection item error:', collectionError);
      return { 
        success: false, 
        error: collectionError ? collectionError.message : 'Collection item not found' 
      };
    }
    
    console.log('Collection item found:', collectionItem);

    // Get current authenticated user
    console.log('Getting current authenticated user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return { success: false, error: 'User not authenticated' };
    }
    
    console.log('Current user:', user.id);

    // Make sure the user owns the collection item
    if (collectionItem.user_id !== user.id) {
      console.error('User does not own this collection item');
      return { success: false, error: 'You do not own this collection item' };
    }
    
    console.log('User ownership verified');

    // Create a new marketplace item
    console.log('Creating new marketplace item');
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
      console.error('Error creating marketplace item:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Marketplace item created with id:', data.id);

    // Update the collection item to mark it as for sale
    console.log('Updating collection item is_for_sale status');
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId);
      
    if (updateError) {
      console.error('Error updating collection item:', updateError);
    } else {
      console.log('Collection item updated successfully');
    }

    return { 
      success: true,
      itemId: data.id
    };
  } catch (err: any) {
    console.error('Error in addToMarketplace:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Remove an item from the marketplace
 */
export const removeFromMarketplace = async (marketplaceItemId: string): Promise<{ success: boolean; error?: string }> => {
  console.log('Starting removeFromMarketplace with marketplaceItemId:', marketplaceItemId);
  try {
    // First, get the marketplace item to check ownership
    console.log('Fetching marketplace item to verify ownership');
    const { data: marketplaceItem, error: fetchError } = await supabase
      .from('marketplace_items')
      .select('seller_id, collection_item_id')
      .eq('id', marketplaceItemId)
      .single();

    if (fetchError || !marketplaceItem) {
      console.error('Error fetching marketplace item:', fetchError);
      return { 
        success: false, 
        error: fetchError ? fetchError.message : 'Marketplace item not found' 
      };
    }
    
    console.log('Marketplace item found:', marketplaceItem);

    // Get current authenticated user
    console.log('Getting current authenticated user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return { success: false, error: 'User not authenticated' };
    }
    
    console.log('Current user:', user.id);

    // Make sure the user is the seller
    if (marketplaceItem.seller_id !== user.id) {
      console.error('User is not the seller of this item');
      return { success: false, error: 'You are not the seller of this item' };
    }
    
    console.log('User ownership verified');

    // Remove from marketplace
    console.log('Removing item from marketplace');
    const { error: deleteError } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', marketplaceItemId);

    if (deleteError) {
      console.error('Error deleting marketplace item:', deleteError);
      return { success: false, error: deleteError.message };
    }
    
    console.log('Marketplace item deleted successfully');

    // Update the collection item to mark it as not for sale
    console.log('Updating collection item is_for_sale status');
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: false })
      .eq('id', marketplaceItem.collection_item_id);
      
    if (updateError) {
      console.error('Error updating collection item:', updateError);
    } else {
      console.log('Collection item updated successfully');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in removeFromMarketplace:', err);
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
};

/**
 * Synchronize marketplace items with collection
 * This is used to ensure all collection items marked as for sale have a corresponding marketplace item
 */
export const synchronizeMarketplaceWithCollection = async (): Promise<void> => {
  console.log('Starting synchronizeMarketplaceWithCollection');
  try {
    // Get current authenticated user
    console.log('Getting current authenticated user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      console.error('User not authenticated');
      return;
    }
    
    console.log('Current user:', user.id);

    // Get all collection items that are marked for sale
    console.log('Fetching collection items marked for sale');
    const { data: forSaleItems, error: collectionError } = await supabase
      .from('collection_items')
      .select('id, is_for_sale')
      .eq('user_id', user.id)
      .eq('is_for_sale', true);

    if (collectionError) {
      console.error('Error fetching for sale items:', collectionError);
      return;
    }
    
    console.log(`Found ${forSaleItems?.length || 0} collection items marked for sale`);

    // Get all marketplace items for this user
    console.log('Fetching user marketplace items');
    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, collection_item_id')
      .eq('seller_id', user.id);

    if (marketplaceError) {
      console.error('Error fetching marketplace items:', marketplaceError);
      return;
    }
    
    console.log(`Found ${marketplaceItems?.length || 0} existing marketplace items for user`);

    // Create a map of collection item IDs that are already in the marketplace
    console.log('Creating map of collection items already in marketplace');
    const marketplaceMap = new Map(
      marketplaceItems?.map(item => [item.collection_item_id, item.id]) || []
    );
    
    console.log('Marketplace map created with size:', marketplaceMap.size);

    // For each for-sale item that's not in the marketplace, add it
    console.log('Adding missing items to marketplace');
    let addedCount = 0;
    for (const item of forSaleItems || []) {
      console.log(`Checking if item ${item.id} needs to be added to marketplace`);
      if (!marketplaceMap.has(item.id)) {
        console.log(`Adding item ${item.id} to marketplace`);
        await addToMarketplace(item.id);
        addedCount++;
      } else {
        console.log(`Item ${item.id} already in marketplace, skipping`);
      }
    }
    
    console.log(`Added ${addedCount} items to marketplace during synchronization`);
    console.log('Marketplace synchronized with collection');
  } catch (err) {
    console.error('Error synchronizing marketplace:', err);
  }
};
