
import { supabase } from "@/integrations/supabase/client";

export async function addToWishlist(userId: string, banknoteId: string): Promise<boolean> {
  try {
    // Check if the item is already in the wishlist
    const { data: existingItems, error: checkError } = await supabase
      .from('wishlist_items')
      .select('id')
      .eq('user_id', userId)
      .eq('banknote_id', banknoteId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking wishlist:", checkError);
      return false;
    }
    
    // If item already exists, return true (already in wishlist)
    if (existingItems) {
      return true;
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
    
    if (error) {
      console.error("Error adding to wishlist:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception adding to wishlist:", error);
    return false;
  }
}

export async function removeFromWishlist(userId: string, banknoteId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', userId)
      .eq('banknote_id', banknoteId);
    
    if (error) {
      console.error("Error removing from wishlist:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception removing from wishlist:", error);
    return false;
  }
}

export async function fetchWishlistItem(userId: string, banknoteId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .eq('banknote_id', banknoteId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error("Error fetching wishlist item:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Exception fetching wishlist item:", error);
    return null;
  }
}

export async function fetchUserWishlist(userId: string): Promise<any[]> {
  try {
    console.log("[fetchUserWishlist] Starting fetch for user:", userId);
    
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        detailed_banknotes(*)
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
 * @param userId The user ID
 * @param countryName The name of the country to filter by
 * @returns Array of wishlist items for the specified country
 */
export async function fetchUserWishlistByCountry(userId: string, countryName: string): Promise<any[]> {
  try {
    console.log("[fetchUserWishlistByCountry] Starting fetch for:", { userId, countryName });
    
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        detailed_banknotes!inner(*)
      `)
      .eq('user_id', userId)
      .eq('detailed_banknotes.country', countryName);
    
    if (error) {
      console.error("[fetchUserWishlistByCountry] Error fetching wishlist by country:", error);
      return [];
    }
    
    console.log(`[fetchUserWishlistByCountry] Found ${data?.length || 0} wishlist items for user ${userId} in country ${countryName}`);
    
    return data || [];
  } catch (error) {
    console.error("[fetchUserWishlistByCountry] Exception fetching wishlist by country:", error);
    return [];
  }
}
