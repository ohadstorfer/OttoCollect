import { supabase } from "@/integrations/supabase/client";
import { MarketplaceItem, User } from "@/types";

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item_id,
        collection_item:collection_items(*),
        seller:seller_id(id, username, rank, avatar_url, email, role, points, created_at)
      `)
      .eq('status', 'Available')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching marketplace items:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }

    // Properly map the data to MarketplaceItem type
    return data.map(item => {
      const mappedItem: MarketplaceItem = {
        id: item.id,
        collectionItem: item.collection_item,
        sellerId: item.seller_id,
        seller: {
          id: item.seller.id,
          username: item.seller.username,
          email: item.seller.email || '',
          avatarUrl: item.seller.avatar_url,
          role: item.seller.role || 'User',
          rank: item.seller.rank || 'Newbie',
          points: item.seller.points || 0,
          createdAt: item.seller.created_at,
          about: '',
          country: '',
          updatedAt: ''
        },
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
      return mappedItem;
    });
  } catch (error) {
    console.error('Error in fetchMarketplaceItems:', error);
    return [];
  }
}

export async function fetchMarketplaceItemById(id: string): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item:collection_items(*),
        seller:seller_id(id, username, rank, avatar_url, email, role, points, created_at)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching marketplace item:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    const mappedItem: MarketplaceItem = {
      id: data.id,
      collectionItem: data.collection_item,
      sellerId: data.seller_id,
      seller: {
        id: data.seller.id,
        username: data.seller.username,
        email: data.seller.email || '',
        avatarUrl: data.seller.avatar_url,
        role: data.seller.role || 'User',
        rank: data.seller.rank || 'Newbie',
        points: data.seller.points || 0,
        createdAt: data.seller.created_at,
        about: '',
        country: '',
        updatedAt: ''
      },
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return mappedItem;
  } catch (error) {
    console.error('Error in fetchMarketplaceItemById:', error);
    return null;
  }
}

export async function fetchUserMarketplaceItems(userId: string): Promise<MarketplaceItem[]> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item:collection_items(*),
        seller:seller_id(id, username, rank, avatar_url, email, role, points, created_at)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user marketplace items:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => {
      const mappedItem: MarketplaceItem = {
        id: item.id,
        collectionItem: item.collection_item,
        sellerId: item.seller_id,
        seller: {
          id: item.seller.id,
          username: item.seller.username,
          email: item.seller.email || '',
          avatarUrl: item.seller.avatar_url,
          role: item.seller.role || 'User',
          rank: item.seller.rank || 'Newbie',
          points: item.seller.points || 0,
          createdAt: item.seller.created_at,
          about: '',
          country: '',
          updatedAt: ''
        },
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      };
      return mappedItem;
    });
  } catch (error) {
    console.error('Error in fetchUserMarketplaceItems:', error);
    return [];
  }
}

export async function addItemToMarketplace(collectionItemId: string, sellerId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .insert([
        { 
          collection_item_id: collectionItemId,
          seller_id: sellerId,
          status: 'Available'
        }
      ]);
    
    if (error) {
      console.error('Error adding item to marketplace:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in addItemToMarketplace:', error);
    return false;
  }
}

export async function removeItemFromMarketplace(marketplaceItemId: string, userId: string): Promise<boolean> {
  try {
    // First check if the user is the seller
    const { data: itemData, error: fetchError } = await supabase
      .from('marketplace_items')
      .select('seller_id')
      .eq('id', marketplaceItemId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching marketplace item:', fetchError);
      return false;
    }
    
    if (itemData.seller_id !== userId) {
      console.error('User is not the seller of this item');
      return false;
    }
    
    // Delete the marketplace item
    const { error: deleteError } = await supabase
      .from('marketplace_items')
      .delete()
      .eq('id', marketplaceItemId);
    
    if (deleteError) {
      console.error('Error removing item from marketplace:', deleteError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeItemFromMarketplace:', error);
    return false;
  }
}

export async function updateMarketplaceItemStatus(
  marketplaceItemId: string, 
  status: 'Available' | 'Reserved' | 'Sold',
  userId: string
): Promise<boolean> {
  try {
    // First check if the user is the seller
    const { data: itemData, error: fetchError } = await supabase
      .from('marketplace_items')
      .select('seller_id')
      .eq('id', marketplaceItemId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching marketplace item:', fetchError);
      return false;
    }
    
    if (itemData.seller_id !== userId) {
      console.error('User is not the seller of this item');
      return false;
    }
    
    // Update the status
    const { error: updateError } = await supabase
      .from('marketplace_items')
      .update({ status })
      .eq('id', marketplaceItemId);
    
    if (updateError) {
      console.error('Error updating marketplace item status:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateMarketplaceItemStatus:', error);
    return false;
  }
}

export async function fetchSellerInfo(sellerId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sellerId)
      .single();
    
    if (error) {
      console.error('Error fetching seller info:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    const user: User = {
      id: data.id,
      username: data.username || '',
      email: data.email || '',
      avatarUrl: data.avatar_url,
      about: data.about || '',
      country: data.country || '',
      role: data.role || 'User',
      rank: data.rank || 'Newbie',
      points: data.points || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    return user;
  } catch (error) {
    console.error('Error in fetchSellerInfo:', error);
    return null;
  }
}
