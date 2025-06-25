import { supabase } from "@/integrations/supabase/client";
import type { CollectionItem } from "@/types";

export async function addToCollection({
  userId,
  banknoteId,
  condition,
  purchasePrice,
  purchaseDate,
  notes,
  location,
  obverseImage,
  reverseImage,
  isForSale = false,
  salePrice,
  hideImages = false
}: {
  userId: string;
  banknoteId: string;
  condition?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  notes?: string;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  isForSale?: boolean;
  salePrice?: number;
  hideImages?: boolean;
}) {
  try {
    const { data, error } = await supabase
      .from("collection_items")
      .insert({
        user_id: userId,
        banknote_id: banknoteId,
        condition,
        purchase_price: purchasePrice,
        purchase_date: purchaseDate ? new Date(purchaseDate).toISOString() : null,
        private_note: notes,
        location,
        obverse_image: obverseImage,
        reverse_image: reverseImage,
        is_for_sale: isForSale,
        sale_price: salePrice,
        hide_images: hideImages
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding to collection:", error);
    throw error;
  }
}

export async function removeFromCollection(collectionItemId: string) {
  try {
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", collectionItemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error removing from collection:", error);
    return false;
  }
}

export async function updateCollectionItem(
  collectionItemId: string,
  updates: {
    condition?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    privateNote?: string;
    publicNote?: string;
    location?: string;
    obverseImage?: string;
    reverseImage?: string;
    isForSale?: boolean;
    salePrice?: number;
    hideImages?: boolean;
  }
) {
  try {
    const updateData: any = {};
    
    if (updates.condition !== undefined) updateData.condition = updates.condition;
    if (updates.purchasePrice !== undefined) updateData.purchase_price = updates.purchasePrice;
    if (updates.purchaseDate !== undefined) {
      updateData.purchase_date = updates.purchaseDate ? new Date(updates.purchaseDate).toISOString() : null;
    }
    if (updates.privateNote !== undefined) updateData.private_note = updates.privateNote;
    if (updates.publicNote !== undefined) updateData.public_note = updates.publicNote;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.obverseImage !== undefined) updateData.obverse_image = updates.obverseImage;
    if (updates.reverseImage !== undefined) updateData.reverse_image = updates.reverseImage;
    if (updates.isForSale !== undefined) updateData.is_for_sale = updates.isForSale;
    if (updates.salePrice !== undefined) updateData.sale_price = updates.salePrice;
    if (updates.hideImages !== undefined) updateData.hide_images = updates.hideImages;

    const { data, error } = await supabase
      .from("collection_items")
      .update(updateData)
      .eq("id", collectionItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating collection item:", error);
    throw error;
  }
}

export async function fetchCollectionItem(id: string): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknote_id (
          *,
          country:country_id(*)
        ),
        unlistedBanknote:unlisted_banknotes_id (
          *
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching collection item:", error);
      return null;
    }

    return data as CollectionItem;
  } catch (error) {
    console.error("Error fetching collection item:", error);
    return null;
  }
}
