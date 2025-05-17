
import { supabase } from "@/integrations/supabase/client";
import { DetailedBanknote } from "@/types";

/**
 * Fetches wishlist items filtered by user, with complete banknote objects.
 */
export async function fetchUserWishlist(userId: string): Promise<{ id: string; banknoteId: string; userId: string; detailed_banknotes: DetailedBanknote; [key: string]: any; }[]> {
  try {
    console.log("[fetchUserWishlist] Starting fetch for user:", userId);

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

    // Debug log: fetched raw data from Supabase
    console.log("[fetchUserWishlist] Raw data from Supabase:", data);

    // TYPE HARMONIZATION: Ensure .detailed_banknotes is DetailedBanknote type.
    const result = (data || []).map((item: any) => ({
      ...item,
      detailed_banknotes: item.detailed_banknotes as DetailedBanknote,
    }));

    console.log("[fetchUserWishlist] Harmonized result:", result);

    return result;
  } catch (error) {
    console.error("[fetchUserWishlist] Exception fetching wishlist:", error);
    return [];
  }
}

/**
 * Fetches wishlist items filtered by country, with complete banknote objects.
 */
export async function fetchUserWishlistByCountry(
  userId: string,
  countryName: string
): Promise<{ id: string; banknoteId: string; userId: string; detailed_banknotes: DetailedBanknote; [key: string]: any; }[]> {
  try {
    console.log("[fetchUserWishlistByCountry] Starting fetch for:", { userId, countryName });

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

    // Debug log: fetched raw data from Supabase
    console.log("[fetchUserWishlistByCountry] Raw data from Supabase:", data);

    // Harmonize: Filter by exactly the banknote country (on full object)
    const filteredData = (data || []).filter(
      (item: any) => item.detailed_banknotes && item.detailed_banknotes.country === countryName
    ).map((item: any) => ({
      ...item,
      detailed_banknotes: item.detailed_banknotes as DetailedBanknote,
    }));

    console.log(`[fetchUserWishlistByCountry] Filtered and harmonized data:`, filteredData);

    return filteredData;
  } catch (error) {
    console.error("[fetchUserWishlistByCountry] Exception fetching wishlist by country:", error);
    return [];
  }
}
