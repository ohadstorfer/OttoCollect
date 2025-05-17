import { supabase } from "@/integrations/supabase/client";
import { DetailedBanknote } from "@/types";

// Convert snake_case keys in DetailedBanknote to camelCase for compatibility with BanknoteDetailCard
function camelCaseBanknoteFields(banknote: any): DetailedBanknote {
  if (!banknote || typeof banknote !== "object") return banknote;
  // Map each snake_case key to camelCase, with fallbacks for undefined keys
  return {
    ...banknote,
    extendedPickNumber: banknote.extended_pick_number ?? banknote.extendedPickNumber,
    pickNumber: banknote.pick_number ?? banknote.pickNumber,
    sultanName: banknote.sultan_name ?? banknote.sultanName,
    sealNames: banknote.seal_names ?? banknote.sealNames,
    turkCatalogNumber: banknote.turk_catalog_number ?? banknote.turkCatalogNumber,
    gregorianYear: banknote.gregorian_year ?? banknote.gregorianYear,
    islamicYear: banknote.islamic_year ?? banknote.islamicYear,
    banknoteDescription: banknote.banknote_description ?? banknote.banknoteDescription,
    historicalDescription: banknote.historical_description ?? banknote.historicalDescription,
    securityElement: banknote.security_element ?? banknote.securityElement,
    signaturesFront: banknote.signatures_front ?? banknote.signaturesFront,
    signaturesBack: banknote.signatures_back ?? banknote.signaturesBack,
    watermark: banknote.watermark_picture ?? banknote.watermark, // Note: Check for correct mapping
    // Keep the rest of keys untouched
  };
}

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

    // Harmonize: Convert .detailed_banknotes to camelCase property names
    const result = (data || []).map((item: any) => {
      const harmonized = {
        ...item,
        detailed_banknotes: camelCaseBanknoteFields(item.detailed_banknotes),
      };
      // Debug log per harmonized item
      console.log("[fetchUserWishlist] Harmonized item:", harmonized);
      return harmonized;
    });

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

    // Harmonize: Filter by country and convert to camelCase
    const filteredData = (data || [])
      .filter(
        (item: any) => item.detailed_banknotes && (
          (item.detailed_banknotes.country === countryName)
        )
      )
      .map((item: any) => {
        const harmonized = {
          ...item,
          detailed_banknotes: camelCaseBanknoteFields(item.detailed_banknotes),
        };
        // Debug log per harmonized item
        console.log("[fetchUserWishlistByCountry] Harmonized item:", harmonized);
        return harmonized;
      });

    return filteredData;
  } catch (error) {
    console.error("[fetchUserWishlistByCountry] Exception fetching wishlist by country:", error);
    return [];
  }
}
