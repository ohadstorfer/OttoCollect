
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceItem, CollectionItem, User } from '@/types';

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        collectionItemId:collection_item_id,
        sellerId:seller_id,
        status,
        createdAt:created_at,
        updatedAt:updated_at,
        collection_items!collection_item_id (
          *,
          banknote:banknote_id(*)
        ),
        seller:profiles!seller_id (
          id,
          username,
          rank,
          avatar_url,
          email,
          role_id,
          role,
          points,
          created_at
        )
      `);

    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }

    if (!data) {
      console.log('No marketplace items found.');
      return [];
    }

    // Map database fields to client-side model
    return data.map(item => mapMarketplaceItemFromDatabase(item));
  } catch (error) {
    console.error('Unexpected error in fetchMarketplaceItems:', error);
    return [];
  }
}

export async function fetchMarketplaceItemById(itemId: string): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        collectionItemId:collection_item_id,
        sellerId:seller_id,
        status,
        createdAt:created_at,
        updatedAt:updated_at,
        collection_items!collection_item_id (
          *,
          banknote:banknote_id(*)
        ),
        seller:profiles!seller_id (
          id,
          username,
          rank,
          avatar_url,
          email,
          role_id,
          role,
          points,
          created_at
        )
      `)
      .eq('id', itemId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching marketplace item by ID:', error);
      return null;
    }

    if (!data) {
      console.log(`No marketplace item found with ID: ${itemId}`);
      return null;
    }

    // Map database fields to client-side model
    return mapMarketplaceItemFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in fetchMarketplaceItemById:', error);
    return null;
  }
}

// Alias for getMarketplaceItemById to maintain compatibility
export const getMarketplaceItemById = fetchMarketplaceItemById;

export async function fetchMarketplaceItemsBySellerId(sellerId: string): Promise<MarketplaceItem[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          id,
          collectionItemId:collection_item_id,
          sellerId:seller_id,
          status,
          createdAt:created_at,
          updatedAt:updated_at,
          collection_items!collection_item_id (
            *,
            banknote:banknote_id(*)
          ),
          seller:profiles!seller_id (
            id,
            username,
            rank,
            avatar_url,
            email,
            role_id,
            role,
            points,
            created_at
          )
        `)
        .eq('seller_id', sellerId);
  
      if (error) {
        console.error('Error fetching marketplace items by seller ID:', error);
        return [];
      }
  
      if (!data) {
        console.log(`No marketplace items found for seller ID: ${sellerId}`);
        return [];
      }
  
      // Map database fields to client-side model
      return data.map(item => mapMarketplaceItemFromDatabase(item));
    } catch (error) {
      console.error('Unexpected error in fetchMarketplaceItemsBySellerId:', error);
      return [];
    }
  }

// Add missing functions needed by CollectionItemForm and Marketplace components
export async function addToMarketplace(collectionItemId: string, sellerId: string): Promise<MarketplaceItem | null> {
  try {
    // First, get the banknote_id from the collection_item
    const { data: collectionItem, error: collectionError } = await supabase
      .from('collection_items')
      .select('banknote_id')
      .eq('id', collectionItemId)
      .single();
    
    if (collectionError || !collectionItem) {
      console.error('Error getting collection item:', collectionError);
      return null;
    }

    // Insert the marketplace item
    const { data, error } = await supabase
      .from('marketplace_items')
      .insert({
        collection_item_id: collectionItemId,
        seller_id: sellerId,
        status: 'Available', // Set initial status
        banknote_id: collectionItem.banknote_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      return null;
    }

    // Fetch the complete marketplace item with all relations
    return await fetchMarketplaceItemById(data.id);
  } catch (error) {
    console.error('Unexpected error in addToMarketplace:', error);
    return null;
  }
}

export async function removeFromMarketplace(collectionItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('collection_item_id', collectionItemId);

    if (error) {
      console.error('Error removing item from marketplace:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in removeFromMarketplace:', error);
    return false;
  }
}

export async function updateMarketplaceItemStatus(itemId: string, status: 'Available' | 'Reserved' | 'Sold'): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .update({ status })
      .eq('id', itemId)
      .select(`
        id,
        collectionItemId:collection_item_id,
        sellerId:seller_id,
        status,
        createdAt:created_at,
        updatedAt:updated_at,
        collection_items!collection_item_id (
          *,
          banknote:banknote_id(*)
        ),
        seller:profiles!seller_id (
          id,
          username,
          rank,
          avatar_url,
          email,
          role_id,
          role,
          points,
          created_at
        )
      `)
      .single();

    if (error) {
      console.error('Error updating marketplace item status:', error);
      return null;
    }

    // Map database fields to client-side model
    return mapMarketplaceItemFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in updateMarketplaceItemStatus:', error);
    return null;
  }
}

export async function deleteMarketplaceItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting marketplace item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in deleteMarketplaceItem:', error);
    return false;
  }
}

// Synchronization function for admin use
export async function synchronizeMarketplaceWithCollection(): Promise<boolean> {
  try {
    // Find collection items marked as 'for sale' but not in marketplace
    const { data: forSaleItems, error: forSaleError } = await supabase
      .from('collection_items')
      .select('id, user_id, banknote_id')
      .eq('is_for_sale', true)
      .not('id', 'in', 
        supabase.from('marketplace_items').select('collection_item_id')
      );
    
    if (forSaleError) {
      console.error('Error finding for-sale items:', forSaleError);
      return false;
    }
    
    if (forSaleItems && forSaleItems.length > 0) {
      // Prepare the items to insert
      const itemsToInsert = forSaleItems.map(item => ({
        collection_item_id: item.id,
        seller_id: item.user_id,
        status: 'Available',
        banknote_id: item.banknote_id
      }));
      
      // Insert the items in batches of 10 to avoid payload size limits
      for (let i = 0; i < itemsToInsert.length; i += 10) {
        const batch = itemsToInsert.slice(i, i + 10);
        const { error: insertError } = await supabase
          .from('marketplace_items')
          .insert(batch);
        
        if (insertError) {
          console.error(`Error inserting batch ${i/10 + 1}:`, insertError);
        }
      }
    }
    
    // Find marketplace items whose collection items are no longer for sale
    const { data: outdatedItems, error: outdatedError } = await supabase
      .from('marketplace_items')
      .select('id, collection_item_id')
      .not('collection_item_id', 'in',
        supabase.from('collection_items').select('id').eq('is_for_sale', true)
      );
      
    if (outdatedError) {
      console.error('Error finding outdated marketplace items:', outdatedError);
      return false;
    }
    
    if (outdatedItems && outdatedItems.length > 0) {
      const idsToRemove = outdatedItems.map(item => item.id);
      
      // Delete in batches of 10
      for (let i = 0; i < idsToRemove.length; i += 10) {
        const batch = idsToRemove.slice(i, i + 10);
        const { error: deleteError } = await supabase
          .from('marketplace_items')
          .delete()
          .in('id', batch);
          
        if (deleteError) {
          console.error(`Error deleting batch ${i/10 + 1}:`, deleteError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in synchronizeMarketplaceWithCollection:', error);
    return false;
  }
}

// Helper function to map database fields to client-side model
function mapMarketplaceItemFromDatabase(item: any): MarketplaceItem {
  // Rename collection_items to collectionItem for consistency
  const collectionItem = item.collection_items || {};
  const seller = item.seller || {};
  
  return {
    id: item.id,
    collectionItem: {
      ...collectionItem,
      banknote: collectionItem.banknote || {}
    },
    sellerId: item.seller_id || item.sellerId,
    seller: {
      id: seller.id || '',
      username: seller.username || '',
      rank: seller.rank || '',
      email: seller.email || '',
      role_id: seller.role_id || '',
      role: seller.role || '',
      points: seller.points || 0,
      createdAt: seller.created_at || '',
      avatarUrl: seller.avatar_url || ''
    },
    status: item.status,
    createdAt: item.created_at || item.createdAt,
    updatedAt: item.updated_at || item.updatedAt
  } as MarketplaceItem;
}
