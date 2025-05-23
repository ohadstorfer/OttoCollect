import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches wishlist items filtered by user
 * Always includes the full detailed banknote data as "detailed_banknotes"
 */
export async function fetchUserWishlist(userId: string): Promise<any[]> {
  try {
    console.log("[fetchUserWishlist] Starting fetch for user:", userId);

    // Updated: Always join full detailed_banknotes object in the response
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        detailed_banknotes:banknote_id (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("[fetchUserWishlist] Error fetching wishlist:", error);
      return [];
    }

    console.log(`[fetchUserWishlist] Found ${data?.length || 0} wishlist items for user:`, userId);

    return data || [];
  } catch (error) {
    console.error("[fetchUserWishlist] Exception fetching wishlist:", error);
    return [];
  }
}

/**
 * Fetches wishlist items filtered by country
 * Always includes the full detailed banknote data as "detailed_banknotes"
 */
export async function fetchUserWishlistByCountry(userId: string, countryName: string): Promise<any[]> {
  try {
    console.log("[fetchUserWishlistByCountry] Starting fetch for:", { userId, countryName });

    // Updated: Always join full detailed_banknotes
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        detailed_banknotes:banknote_id (*)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("[fetchUserWishlistByCountry] Error fetching wishlist by country:", error);
      return [];
    }

    // Filter by country using the joined detailed_banknotes for maximum accuracy
    const filteredData = (data || []).filter(item =>
      item.detailed_banknotes && item.detailed_banknotes.country === countryName
    );

    console.log(`[fetchUserWishlistByCountry] Found ${filteredData?.length || 0} wishlist items for user ${userId} in country ${countryName}`);

    return filteredData;
  } catch (error) {
    console.error("[fetchUserWishlistByCountry] Exception fetching wishlist by country:", error);
    return [];
  }
}

/**
 * Deletes a wishlist item by its id
 */
export async function deleteWishlistItem(wishlistItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', wishlistItemId);

    if (error) {
      console.error("[deleteWishlistItem] Failed to delete wishlist item:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[deleteWishlistItem] Exception deleting wishlist item:", err);
    return false;
  }
}

export async function addToWishlist(userId: string, banknoteId: string): Promise<boolean> {
  try {
    // Check if the item is already in the wishlist
    const { data: existingItem } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('banknote_id', banknoteId)
      .single();

    if (existingItem) {
      return false; // Item already in wishlist
    }

    // Add to wishlist
    const { error } = await supabase
      .from('wishlist_items')
      .insert([
        {
          user_id: userId,
          banknote_id: banknoteId,
          priority: 'Medium' // Default priority
        }
      ]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    throw error;
  }
}

export async function fetchWishlistItem(userId: string, banknoteId: string) {
  try {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .eq('banknote_id', banknoteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching wishlist item:', error);
    throw error;
  }
}
