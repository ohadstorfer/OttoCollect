import { supabase } from "@/integrations/supabase/client";
import { MarketplaceItem, User, CollectionItem, BanknoteCondition } from "@/types";
import { v4 as uuidv4 } from 'uuid';

export async function fetchMarketplaceItems(): Promise<MarketplaceItem[]> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_item:collection_items(*),
        seller:profiles(id, username, rank, avatar_url, email, role, points, created_at)
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
      // Make sure the seller property exists and is correctly typed
      const seller = item.seller || { 
        id: '',
        username: '',
        email: '',
        avatar_url: '',
        role: 'User',
        rank: 'Newbie',
        points: 0,
        created_at: '',
        about: '',
        country: '',
        updated_at: ''
      };
      
      const mappedItem: MarketplaceItem = {
        id: item.id,
        collectionItem: {
          id: item.collection_item.id,
          userId: item.collection_item.user_id,
          banknoteId: item.collection_item.banknote_id,
          condition: item.collection_item.condition as BanknoteCondition,
          purchasePrice: item.collection_item.purchase_price || 0,
          purchaseDate: item.collection_item.purchase_date || '',
          salePrice: item.collection_item.sale_price || 0,
          isForSale: item.collection_item.is_for_sale,
          obverseImage: item.collection_item.obverse_image || '',
          reverseImage: item.collection_item.reverse_image || '',
          publicNote: item.collection_item.public_note || '',
          privateNote: item.collection_item.private_note || '',
          location: item.collection_item.location || '',
          createdAt: item.collection_item.created_at,
          updatedAt: item.collection_item.updated_at,
          orderIndex: item.collection_item.order_index || 0,
          banknote: null
        },
        sellerId: item.seller_id,
        seller: {
          id: seller?.id || '',
          username: seller?.username || '',
          email: seller?.email || '',
          avatarUrl: seller?.avatar_url || '',
          role: seller?.role || 'User',
          rank: seller?.rank || 'Newbie',
          points: seller?.points || 0,
          createdAt: seller?.created_at || '',
          about: '',
          country: '',
          updatedAt: ''
        },
        status: item.status as "Available" | "Reserved" | "Sold",
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
        seller:profiles(id, username, rank, avatar_url, email, role, points, created_at)
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
    
    // Make sure the seller property exists and is correctly typed
    const seller = data.seller || { 
      id: '',
      username: '',
      email: '',
      avatarUrl: '',
      role: 'User',
      rank: 'Newbie',
      points: 0,
      createdAt: '',
      about: '',
      country: '',
      updatedAt: ''
    };
    
    const mappedItem: MarketplaceItem = {
      id: data.id,
      collectionItem: {
        id: data.collection_item.id,
        userId: data.collection_item.user_id,
        banknoteId: data.collection_item.banknote_id,
        condition: data.collection_item.condition as BanknoteCondition,
        purchasePrice: data.collection_item.purchase_price || 0,
        purchaseDate: data.collection_item.purchase_date || '',
        salePrice: data.collection_item.sale_price || 0,
        isForSale: data.collection_item.is_for_sale,
        obverseImage: data.collection_item.obverse_image || '',
        reverseImage: data.collection_item.reverse_image || '',
        publicNote: data.collection_item.public_note || '',
        privateNote: data.collection_item.private_note || '',
        location: data.collection_item.location || '',
        createdAt: data.collection_item.created_at,
        updatedAt: data.collection_item.updated_at,
        orderIndex: data.collection_item.order_index || 0,
        banknote: null
      },
      sellerId: data.seller_id,
      seller: {
        id: seller?.id || '',
        username: seller?.username || '',
        email: seller?.email || '',
        avatarUrl: seller?.avatar_url || '',
        role: seller?.role || 'User',
        rank: seller?.rank || 'Newbie',
        points: seller?.points || 0,
        createdAt: seller?.created_at || '',
        about: '',
        country: '',
        updatedAt: ''
      },
      status: data.status as "Available" | "Reserved" | "Sold",
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
        seller:profiles(id, username, rank, avatar_url, email, role, points, created_at)
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
        collectionItem: {
          id: item.collection_item.id,
          userId: item.collection_item.user_id,
          banknoteId: item.collection_item.banknote_id,
          condition: item.collection_item.condition,
          purchasePrice: item.collection_item.purchase_price || 0,
          purchaseDate: item.collection_item.purchase_date || '',
          salePrice: item.collection_item.sale_price || 0,
          isForSale: item.collection_item.is_for_sale,
          obverseImage: item.collection_item.obverse_image || '',
          reverseImage: item.collection_item.reverse_image || '',
          publicNote: item.collection_item.public_note || '',
          privateNote: item.collection_item.private_note || '',
          location: item.collection_item.location || '',
          createdAt: item.collection_item.created_at,
          updatedAt: item.collection_item.updated_at,
          orderIndex: item.collection_item.order_index || 0,
          banknote: null
        },
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
        status: item.status as "Available" | "Reserved" | "Sold",
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

export async function removeItemFromMarketplace(marketplaceItemId: string): Promise<boolean> {
  try {
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
