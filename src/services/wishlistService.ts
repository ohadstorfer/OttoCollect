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

export const addToWishlist = async (userId: string, banknoteId: string) => {
  const { data, error } = await supabase
    .from("wishlist")
    .insert([{ user_id: userId, banknote_id: banknoteId }])
    .select()
    .single();

  if (error) {
    console.error("Error adding to wishlist:", error);
    return false;
  }

  return data;
};

export const removeFromWishlist = async (userId: string, banknoteId: string) => {
  const { error } = await supabase
    .from("wishlist")
    .delete()
    .match({ user_id: userId, banknote_id: banknoteId });

  if (error) {
    console.error("Error removing from wishlist:", error);
    return false;
  }

  return true;
};

export const fetchWishlistItem = async (userId: string, banknoteId: string) => {
  const { data, error } = await supabase
    .from("wishlist")
    .select()
    .match({ user_id: userId, banknote_id: banknoteId })
    .single();

  if (error) {
    console.error("Error fetching wishlist item:", error);
    return false;
  }

  return !!data;
};
