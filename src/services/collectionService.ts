import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// PATCH: Fix argument type, rename userId to user_id throughout
type UnlistedBanknoteInsert = {
  user_id: string;
  country: string;
  face_value: string;
  name: string;
  category: string;
  type: string;
  gregorian_year?: string | null;
  islamic_year?: string | null;
  sultan_name?: string | null;
  printer?: string | null;
  rarity?: string | null;
  extended_pick_number: string;
};

export async function createUnlistedBanknoteWithCollectionItem(
  banknote: UnlistedBanknoteInsert
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('unlisted_banknotes')
      .insert([banknote])
      .select('id')
      .single();

    if (error) {
      console.error("Error creating unlisted banknote:", error);
      return null;
    }

    return data ? { id: data.id } : null;
  } catch (error) {
    console.error("Error in createUnlistedBanknoteWithCollectionItem:", error);
    return null;
  }
}

// Fix: upload to correct bucket
export async function uploadCollectionImage(file: File): Promise<string | null> {
  try {
    const imageName = `${uuidv4()}-${file.name}`;
    const { data, error } = await supabase
      .storage
      .from('banknote_images')
      .upload(imageName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const publicUrl = `https://psnzolounfwgvkupepxb.supabase.co/storage/v1/object/public/banknote_images/${data.path}`;
    return publicUrl;
  } catch (error) {
    console.error('Error during image upload:', error);
    return null;
  }
}

// ADD: Create a collection item after unlisted banknote creation
type CollectionItemInsert = {
  user_id: string;
  unlisted_banknotes_id: string;
  is_unlisted_banknote: boolean;
  condition?: string;
  public_note?: string | null;
  private_note?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  location?: string | null;
  is_for_sale?: boolean;
  sale_price?: number | null;
  obverse_image?: string | null;
  reverse_image?: string | null;
};

export async function createCollectionItem(
  item: CollectionItemInsert
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([item])
      .select('id')
      .single();
    if (error) {
      console.error("Error creating collection item:", error);
      return null;
    }
    return data ? { id: data.id } : null;
  } catch (error) {
    console.error("Error in createCollectionItem:", error);
    return null;
  }
}

/**
 * Fetch the count of collection items in each country for a given user.
 * Returns an object { [countryName]: count }
 */
export async function fetchUserCollectionCountByCountry(userId: string): Promise<Record<string, number>> {
  // Query all collection_items for user with linked detailed_banknotes (not unlisted_only),
  // group/join by detailed_banknotes.country, and count occurrences.
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      banknote_id,
      is_unlisted_banknote,
      banknote:detailed_banknotes (
        country
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error("[collectionService] Error fetching collection items for user", userId, error);
    return {};
  }

  // Aggregate counts per country.
  const counts: Record<string, number> = {};

  (data || []).forEach((item: any) => {
    // Only count if not "unlisted" and a valid country exists.
    if (!item.is_unlisted_banknote && item.banknote && item.banknote.country) {
      const countryName = item.banknote.country;
      counts[countryName] = (counts[countryName] || 0) + 1;
    }
  });

  return counts;
}

// Stub missing exports for compatibility
export async function addToCollection(...args: any[]): Promise<any> {
  throw new Error("addToCollection is not implemented in this context.");
}

export async function updateCollectionItem(...args: any[]): Promise<any> {
  throw new Error("updateCollectionItem is not implemented in this context.");
}

export async function removeFromCollection(...args: any[]): Promise<any> {
  throw new Error("removeFromCollection is not implemented in this context.");
}

export async function fetchUserCollection(...args: any[]): Promise<any> {
  throw new Error("fetchUserCollection is not implemented in this context.");
}

export async function fetchUserCollectionByCountry(...args: any[]): Promise<any> {
  throw new Error("fetchUserCollectionByCountry is not implemented in this context.");
}

export async function fetchUserCollectionItems(...args: any[]): Promise<any> {
  throw new Error("fetchUserCollectionItems is not implemented in this context.");
}

export async function fetchBanknoteCategoriesAndTypes(...args: any[]): Promise<any> {
  throw new Error("fetchBanknoteCategoriesAndTypes is not implemented in this context.");
}

export async function fetchCollectionItem(...args: any[]): Promise<any> {
  throw new Error("fetchCollectionItem is not implemented in this context.");
}
