import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, DetailedBanknote, BanknoteCondition } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { fetchBanknoteById } from "@/services/banknoteService";
import type { Database } from "@/integrations/supabase/types";

// Type definition for collection items table insert
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

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

export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    console.log("Fetching collection for user:", userId);
    
    const { data: collectionItems, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error("Error fetching collection:", error);
      throw error;
    }

    console.log(`Found ${collectionItems?.length || 0} collection items for user:`, userId);

    // Fetch banknote details for each collection item
    const enrichedItems = await Promise.all(
      (collectionItems || []).map(async (item) => {
        const banknote = await fetchBanknoteById(item.banknote_id);
        
        if (!banknote) {
          console.error(`Banknote not found for collection item: ${item.banknote_id}`);
          return null;
        }
        
        // Ensure banknote.type is never undefined - default to "Issued note"
        if (!banknote.type) {
          banknote.type = "Issued note";
        }
        
        return {
          id: item.id,
          userId: item.user_id,
          banknoteId: item.banknote_id,
          banknote: banknote,
          condition: item.condition as BanknoteCondition,
          salePrice: item.sale_price,
          isForSale: item.is_for_sale,
          publicNote: item.public_note,
          privateNote: item.private_note,
          purchasePrice: item.purchase_price,
          purchaseDate: item.purchase_date,
          location: item.location,
          obverseImage: item.obverse_image,
          reverseImage: item.reverse_image,
          orderIndex: item.order_index,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        } as CollectionItem;
      })
    );

    // Filter out any null items (where banknote wasn't found)
    return enrichedItems.filter(item => item !== null) as CollectionItem[];
  } catch (error) {
    console.error("Error in fetchUserCollection:", error);
    return [];
  }
}

export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  // This function replaces fetchUserCollection but with a more accurate name
  return fetchUserCollection(userId);
}

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

export async function deleteCollectionItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);
    
    if (error) {
      console.error("Error deleting collection item:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in deleteCollectionItem:", error);
    return false;
  }
}
