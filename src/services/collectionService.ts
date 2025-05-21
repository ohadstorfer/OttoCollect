
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

// ========== PLACEHOLDER STUBS for BUILD ==========
// TODO: Properly implement these in future

export async function addToCollection() { throw new Error("addToCollection not implemented"); }
export async function removeFromCollection() { throw new Error("removeFromCollection not implemented"); }
export async function fetchUserCollection() { throw new Error("fetchUserCollection not implemented"); }
export async function fetchUserCollectionByCountry() { throw new Error("fetchUserCollectionByCountry not implemented"); }
export async function fetchUserCollectionItems() { throw new Error("fetchUserCollectionItems not implemented"); }
export async function fetchCollectionItem() { throw new Error("fetchCollectionItem not implemented"); }
export async function fetchBanknoteCategoriesAndTypes() { throw new Error("fetchBanknoteCategoriesAndTypes not implemented"); }
export async function fetchUserCollectionCountByCountry() { throw new Error("fetchUserCollectionCountByCountry not implemented"); }
export async function updateCollectionItem() { throw new Error("updateCollectionItem not implemented"); }

