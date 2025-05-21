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
