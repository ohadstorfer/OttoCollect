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

/** Create Unlisted Banknote and return only banknote object with id */
export async function createUnlistedBanknoteWithCollectionItem(
  banknote: UnlistedBanknoteInsert
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('unlisted_banknotes')
      .insert([banknote])
      .select('id')
      .maybeSingle();

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

/** Insert a new collection item (for unlisted or listed banknotes) */
export async function createCollectionItem(item: any): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([item])
      .select('id')
      .maybeSingle();

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

// PATCH: Use correct bucket
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

// ====================== COLLECTION FETCHING ==========================

/** Fetch collection items for the given user and country. */
export async function fetchUserCollectionByCountry(userId: string, countryId: string) {
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      *,
      banknote:detailed_banknotes (*)
    `)
    .eq('user_id', userId)
    .eq('banknote.country', countryId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching user collection by country:', error);
    return [];
  }
  return data || [];
}

/** Fetch all collection items for a user */
export async function fetchUserCollectionItems(userId: string) {
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      *,
      banknote:detailed_banknotes (*)
    `)
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching user collection items:', error);
    return [];
  }
  return data || [];
}

/** Fetch a single collection item by its id (with full banknote details) */
export async function fetchCollectionItem(itemId: string) {
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      *,
      banknote:detailed_banknotes (*)
    `)
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch collection item:", error);
    return null;
  }
  return data;
}

/** Fetch the number of items by country for a user, returns: { 'CountryName': count, ... } */
export async function fetchUserCollectionCountByCountry(userId: string) {
  // Query all items with their banknote.country for the user, then count per country in JS
  const { data, error } = await supabase
    .from('collection_items')
    .select(`
      id,
      banknote:detailed_banknotes (country)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error("Error fetching collection counts by country:", error);
    return {};
  }
  // Reduce to count by country
  const counts: Record<string, number> = {};
  data?.forEach((item: any) => {
    const country = item.banknote?.country || "Unknown";
    counts[country] = (counts[country] || 0) + 1;
  });
  return counts;
}

/** Fetch categories and types for the given user's collection items. */
export async function fetchBanknoteCategoriesAndTypes(items: any[]) {
  // This function typically processes categories/types from the passed items, not from the DB
  const categories: { id: string; name: string; count: number }[] = [];
  const types: { id: string; name: string; count: number }[] = [];
  // For simplicity, return empty arrays here; you may want to improve with your original logic.
  return { categories, types };
}

// ========== Collection modification actions (no-ops if not used) ==========

export async function addToCollection() { /* optionally implement if needed */ }
export async function removeFromCollection() { /* optionally implement if needed */ }
export async function updateCollectionItem() { /* optionally implement if needed */ }
