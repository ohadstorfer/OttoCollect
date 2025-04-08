
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
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        *,
        detailed_banknotes!inner(*)
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching wishlist:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception fetching wishlist:", error);
    return [];
  }
}
