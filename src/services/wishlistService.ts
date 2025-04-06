
import { supabase, TablesInsert, TablesRow } from "@/integrations/supabase/client";
import { WishlistItem } from "@/types";
import { fetchBanknoteById } from "./banknoteService";

export async function fetchUserWishlist(userId: string): Promise<WishlistItem[]> {
  try {
    console.log("Fetching wishlist for user:", userId);
    
    const { data: wishlistItems, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error("Error fetching wishlist:", error);
      throw error;
    }

    console.log(`Found ${wishlistItems?.length || 0} wishlist items for user:`, userId);

    // Fetch banknote details for each wishlist item
    const enrichedItems = await Promise.all(
      (wishlistItems || []).map(async (item) => {
        const banknote = await fetchBanknoteById(item.banknote_id);
        return {
          id: item.id,
          userId: item.user_id,
          banknoteId: item.banknote_id,
          banknote: banknote!,
          priority: item.priority as 'Low' | 'Medium' | 'High',
          note: item.note,
          createdAt: item.created_at
        } as WishlistItem;
      })
    );

    return enrichedItems;
  } catch (error) {
    console.error("Error in fetchUserWishlist:", error);
    return [];
  }
}

export async function addToWishlist(
  userId: string, 
  banknoteId: string, 
  priority: 'Low' | 'Medium' | 'High',
  note?: string
): Promise<WishlistItem | null> {
  try {
    console.log("Adding banknote to wishlist:", { userId, banknoteId, priority });
    
    const newItem: TablesInsert<'wishlist_items'> = {
      user_id: userId,
      banknote_id: banknoteId,
      priority: priority,
      note: note
    };

    const { data: insertedItem, error } = await supabase
      .from('wishlist_items')
      .insert(newItem)
      .select('*')
      .single();
    
    if (error) {
      console.error("Error adding to wishlist:", error);
      throw error;
    }

    // Fetch the banknote details
    const banknote = await fetchBanknoteById(insertedItem.banknote_id);
    
    const wishlistItem: WishlistItem = {
      id: insertedItem.id,
      userId: insertedItem.user_id,
      banknoteId: insertedItem.banknote_id,
      banknote: banknote!,
      priority: insertedItem.priority as 'Low' | 'Medium' | 'High',
      note: insertedItem.note,
      createdAt: insertedItem.created_at
    };

    return wishlistItem;
  } catch (error) {
    console.error("Error in addToWishlist:", error);
    return null;
  }
}

export async function removeFromWishlist(wishlistItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', wishlistItemId);
    
    if (error) {
      console.error("Error removing from wishlist:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeFromWishlist:", error);
    return false;
  }
}
