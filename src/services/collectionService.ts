import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, BanknoteCondition, DetailedBanknote, Banknote } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching collection:", error);
      return [];
    }

    return data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      condition: item.condition as BanknoteCondition,
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      salePrice: item.sale_price,
      isForSale: item.is_for_sale,
      obverseImage: item.obverse_image,
      reverseImage: item.reverse_image,
      publicNote: item.public_note,
      privateNote: item.private_note,
      location: item.location,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      orderIndex: item.order_index,
      banknote: null // This will be populated from the banknote query
    }));
  } catch (error) {
    console.error("Error in fetchUserCollection:", error);
    return [];
  }
}

export async function fetchCollectionItem(itemId: string): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (error) {
      console.error("Error fetching collection item:", error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      condition: data.condition as BanknoteCondition,
      purchasePrice: data.purchase_price,
      purchaseDate: data.purchase_date,
      salePrice: data.sale_price,
      isForSale: data.is_for_sale,
      obverseImage: data.obverse_image,
      reverseImage: data.reverse_image,
      publicNote: data.public_note,
      privateNote: data.private_note,
      location: data.location,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      orderIndex: data.order_index,
      banknote: null // This will be populated from the banknote query
    };
  } catch (error) {
    console.error("Error in fetchCollectionItem:", error);
    return null;
  }
}

export async function addToCollection(userId: string, banknoteId: string, condition?: BanknoteCondition): Promise<CollectionItem | null> {
  try {
    const newItem = {
      id: uuidv4(),
      user_id: userId,
      banknote_id: banknoteId,
      condition: condition || 'VF',
      is_for_sale: false,
      order_index: 0,
    };

    const { data, error } = await supabase
      .from("collection_items")
      .insert([newItem])
      .select()
      .single();

    if (error) {
      console.error("Error adding to collection:", error);
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      condition: data.condition as BanknoteCondition,
      purchasePrice: data.purchase_price || 0,
      purchaseDate: data.purchase_date || '',
      salePrice: data.sale_price || 0,
      isForSale: data.is_for_sale,
      obverseImage: data.obverse_image || null,
      reverseImage: data.reverse_image || null,
      publicNote: data.public_note || null,
      privateNote: data.private_note || null,
      location: data.location || null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      orderIndex: data.order_index,
      banknote: null
    };
  } catch (error) {
    console.error("Error in addToCollection:", error);
    return null;
  }
}

export async function removeFromCollection(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error removing from collection:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in removeFromCollection:", error);
    return false;
  }
}

export async function updateCollectionItem(itemId: string, item: Partial<CollectionItem>): Promise<boolean> {
  try {
    // Convert from our client model to the database model
    const dbItem = {
      condition: item.condition,
      purchase_price: item.purchasePrice,
      purchase_date: item.purchaseDate,
      sale_price: item.salePrice,
      is_for_sale: item.isForSale,
      obverse_image: item.obverseImage,
      reverse_image: item.reverseImage,
      public_note: item.publicNote,
      private_note: item.privateNote,
      location: item.location,
      order_index: item.orderIndex,
    };

    const { error } = await supabase
      .from("collection_items")
      .update(dbItem)
      .eq("id", itemId);

    if (error) {
      console.error("Error updating collection item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateCollectionItem:", error);
    return false;
  }
}

export async function deleteCollectionItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("Error deleting collection item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteCollectionItem:", error);
    return false;
  }
}

export async function uploadCollectionImage(file: File): Promise<string> {
  try {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error("User not authenticated");

    const userId = user.data.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('banknote_images')
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    const { data } = supabase.storage
      .from('banknote_images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error("Error in uploadCollectionImage:", error);
    throw error;
  }
}

export type { CollectionItem };

export async function fetchBanknoteCategoriesAndTypes(collectionItems: CollectionItem[], banknotes: DetailedBanknote[]): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> {
  const categories: Record<string, { id: string; name: string; count: number }> = {};
  const types: Record<string, { id: string; name: string; count: number }> = {};
  
  collectionItems.forEach(item => {
    const banknote = banknotes.find(b => b.id === item.banknoteId);
    if (banknote) {
      // Use categoryId if available, otherwise use a default category
      const categoryName = banknote.categoryId || 'Uncategorized';
      const categoryId = banknote.categoryId || 'uncategorized';
      if (!categories[categoryId]) {
        categories[categoryId] = { id: categoryId, name: categoryName, count: 0 };
      }
      categories[categoryId].count += 1;
      
      // Use typeId if available, otherwise use a default type
      const typeName = banknote.typeId || 'Unknown';
      const typeId = banknote.typeId || 'unknown';
      if (!types[typeId]) {
        types[typeId] = { id: typeId, name: typeName, count: 0 };
      }
      types[typeId].count += 1;
    }
  });
  
  return {
    categories: Object.values(categories),
    types: Object.values(types)
  };
}

export function getCategoryCountsFromCollection(collection: CollectionItem[], banknotes: DetailedBanknote[]): { id: string; name: string; count: number }[] {
  if (!collection || !banknotes) return [];

  const categoryMap = new Map<string, { id: string, name: string, count: number }>();
  
  collection.forEach(item => {
    const banknote = banknotes.find(b => b.id === item.banknoteId);
    if (banknote?.category) {
      const categoryId = banknote.category;
      const categoryName = banknote.category;
      const existing = categoryMap.get(categoryId);
      
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(categoryId, { id: categoryId, name: categoryName, count: 1 });
      }
    }
  });
  
  return Array.from(categoryMap.values());
}

export function getCountryCountsFromCollection(collection: CollectionItem[], banknotes: DetailedBanknote[]): { id: string; name: string; count: number }[] {
  if (!collection || !banknotes) return [];
  
  const countryMap = new Map<string, { id: string, name: string, count: number }>();
  
  collection.forEach(item => {
    const banknote = banknotes.find(b => b.id === item.banknoteId);
    if (banknote?.country) {
      const countryId = banknote.country;
      const countryName = banknote.country;
      const existing = countryMap.get(countryId);
      
      if (existing) {
        existing.count += 1;
      } else {
        countryMap.set(countryId, { id: countryId, name: countryName, count: 1 });
      }
    }
  });
  
  return Array.from(countryMap.values());
}
