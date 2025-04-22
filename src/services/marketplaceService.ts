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
        collection_item (
          *,
          banknote (*)
        ),
        seller:profiles (
          id,
          username,
          rank,
          avatar_url
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
        collection_item (
          *,
          banknote (*)
        ),
        seller:profiles (
          id,
          username,
          rank,
          avatar_url
        )
      `)
      .eq('id', itemId)
      .single();

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
          collection_item (
            *,
            banknote (*)
          ),
          seller:profiles (
            id,
            username,
            rank,
            avatar_url
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

export async function createMarketplaceItem(collectionItemId: string, sellerId: string): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .insert([
        {
          collection_item_id: collectionItemId,
          seller_id: sellerId,
          status: 'Available' // Set initial status
        }
      ])
      .select(`
        id,
        collectionItemId:collection_item_id,
        sellerId:seller_id,
        status,
        createdAt:created_at,
        updatedAt:updated_at,
        collection_item (
          *,
          banknote (*)
        ),
        seller:profiles (
          id,
          username,
          rank,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating marketplace item:', error);
      return null;
    }

    // Map database fields to client-side model
    return mapMarketplaceItemFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in createMarketplaceItem:', error);
    return null;
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
        collection_item (
          *,
          banknote (*)
        ),
        seller:profiles (
          id,
          username,
          rank,
          avatar_url
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

// Helper function to map database fields to client-side model
function mapMarketplaceItemFromDatabase(item: any): MarketplaceItem {
  return {
    id: item.id,
    collectionItem: item.collection_item,
    sellerId: item.seller_id,
    seller: {
      id: item.seller?.id || '',
      username: item.seller?.username || '',
      rank: item.seller?.rank || '',
      email: item.seller?.email,
      role_id: item.seller?.role_id,
      role: item.seller?.role,
      points: item.seller?.points,
      createdAt: item.seller?.created_at,
      avatarUrl: item.seller?.avatar_url
    },
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  } as MarketplaceItem;
}
