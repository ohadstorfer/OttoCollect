import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, Banknote, BanknoteCondition } from "@/types";

export const fetchUserCollectionItems = async (userId: string): Promise<CollectionItem[]> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknote_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching collection items:", error);
      throw error;
    }

    return data as CollectionItem[];
  } catch (error) {
    console.error("Error fetching collection items:", error);
    throw error;
  }
};

export const fetchCollectionItem = async (itemId: string): Promise<CollectionItem | null> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknote_id (*)
      `)
      .eq('id', itemId)
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
};

export const createCollectionItem = async (
  userId: string,
  banknoteId: string,
  condition: BanknoteCondition,
  purchasePrice?: number,
  purchaseDate?: string,
  location?: string,
  obverseImage?: string,
  reverseImage?: string,
  personalImages: string[] = [],
  publicNote?: string,
  privateNote?: string,
  isForSale: boolean = false,
  salePrice?: number,
  orderIndex?: number
): Promise<CollectionItem> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([
        {
          user_id: userId,
          banknote_id: banknoteId,
          condition: condition,
          purchase_price: purchasePrice,
          purchase_date: purchaseDate,
          location: location,
          obverse_image: obverseImage,
          reverse_image: reverseImage,
          personal_images: personalImages,
          public_note: publicNote,
          private_note: privateNote,
          is_for_sale: isForSale,
          sale_price: salePrice,
          order_index: orderIndex,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating collection item:", error);
      throw error;
    }

    return data as CollectionItem;
  } catch (error) {
    console.error("Error creating collection item:", error);
    throw error;
  }
};

export const updateCollectionItem = async (itemId: string, data: Partial<CollectionItem>): Promise<CollectionItem> => {
  try {
    const updateData: any = { ...data };
    
    // Handle the date properly
    if (updateData.purchaseDate && typeof updateData.purchaseDate === 'object' && updateData.purchaseDate.toISOString) {
      updateData.purchaseDate = updateData.purchaseDate.toISOString();
    }

    const { data: updatedItem, error } = await supabase
      .from('collection_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error("Error updating collection item:", error);
      throw error;
    }

    return updatedItem as CollectionItem;
  } catch (error) {
    console.error("Error updating collection item:", error);
    throw error;
  }
};

export const deleteCollectionItem = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error("Error deleting collection item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting collection item:", error);
    return false;
  }
};

export const fetchBanknoteCategoriesAndTypes = async (
  collectionItems: CollectionItem[]
): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> => {
  const categoryCounts: { [key: string]: number } = {};
  const typeCounts: { [key: string]: number } = {};

  collectionItems.forEach((item) => {
    const banknote = item.banknote;

    // Count categories
    if (banknote?.category) {
      categoryCounts[banknote.category] = (categoryCounts[banknote.category] || 0) + 1;
    }

    // Count types
    if (banknote?.type) {
      typeCounts[banknote.type] = (typeCounts[banknote.type] || 0) + 1;
    }
  });

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    id: name,
    name: name,
    count: count,
  }));

  const types = Object.entries(typeCounts).map(([name, count]) => ({
    id: name,
    name: name,
    count: count,
  }));

  return { categories, types };
};

export const fetchUserCollection = async (userId: string): Promise<CollectionItem[]> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknote_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching collection:", error);
      throw error;
    }

    return data as CollectionItem[];
  } catch (error) {
    console.error("Error fetching collection:", error);
    throw error;
  }
};
