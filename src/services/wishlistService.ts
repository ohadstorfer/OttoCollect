import { supabase } from "@/integrations/supabase/client";
import { DetailedBanknote } from "@/types";

// Convert snake_case keys in DetailedBanknote to camelCase for compatibility with BanknoteDetailCard
export function camelCaseBanknoteFields(banknote: any): DetailedBanknote {
  if (!banknote || typeof banknote !== "object") return banknote;
  return {
    // Manually map/camel-case all expected props for DetailedBanknote
    id: banknote.id,
    catalogId: banknote.catalog_id ?? banknote.catalogId,
    country: banknote.country,
    denomination: banknote.denomination,
    year: banknote.year ?? banknote.gregorian_year ?? banknote.year,
    series: banknote.series,
    description: banknote.description,
    obverseDescription: banknote.obverse_description ?? banknote.obverseDescription,
    reverseDescription: banknote.reverse_description ?? banknote.reverseDescription,
    imageUrls: banknote.image_urls ?? banknote.imageUrls ?? [],
    isApproved: banknote.is_approved ?? banknote.isApproved,
    isPending: banknote.is_pending ?? banknote.isPending,
    createdAt: banknote.created_at ?? banknote.createdAt,
    updatedAt: banknote.updated_at ?? banknote.updatedAt,
    createdBy: banknote.created_by ?? banknote.createdBy,
    pickNumber: banknote.pick_number ?? banknote.pickNumber,
    turkCatalogNumber: banknote.turk_catalog_number ?? banknote.turkCatalogNumber,
    sultanName: banknote.sultan_name ?? banknote.sultanName,
    sealNames: banknote.seal_names ?? banknote.sealNames,
    rarity: banknote.rarity,
    printer: banknote.printer,
    type: banknote.type,
    category: banknote.category,
    securityFeatures: banknote.security_features ?? banknote.securityFeatures ?? [],
    watermark: banknote.watermark_picture ?? banknote.watermark,
    signatures: banknote.signatures ?? [],
    colors: banknote.colors,
    gradeCounts: banknote.grade_counts ?? banknote.gradeCounts,
    averagePrice: banknote.average_price ?? banknote.averagePrice,
    islamicYear: banknote.islamic_year ?? banknote.islamicYear,
    gregorianYear: banknote.gregorian_year ?? banknote.gregorianYear,
    banknoteDescription: banknote.banknote_description ?? banknote.banknoteDescription,
    historicalDescription: banknote.historical_description ?? banknote.historicalDescription,
    serialNumbering: banknote.serial_numbering ?? banknote.serialNumbering,
    securityElement: banknote.security_element ?? banknote.securityElement,
    signaturesFront: banknote.signatures_front ?? banknote.signaturesFront,
    signaturesBack: banknote.signatures_back ?? banknote.signaturesBack,
    extendedPickNumber: banknote.extended_pick_number ?? banknote.extendedPickNumber,
    // allow extra fields to flow if present
    ...banknote,
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
