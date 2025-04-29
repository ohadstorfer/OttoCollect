
import { supabase } from "@/integrations/supabase/client";
import { CollectionItem, Banknote, BanknoteCondition } from "@/types";
import { v4 as uuidv4 } from 'uuid';

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

    // Transform database fields to match the client-side model
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      banknote: item.banknote as Banknote,
      condition: item.condition as BanknoteCondition,
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      location: item.location,
      obverseImage: item.obverse_image,
      reverseImage: item.reverse_image,
      personalImages: item.personal_images as string[] || [],
      publicNote: item.public_note,
      privateNote: item.private_note,
      isForSale: item.is_for_sale,
      salePrice: item.sale_price,
      orderIndex: item.order_index,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
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

    return {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      banknote: data.banknote as Banknote,
      condition: data.condition as BanknoteCondition,
      purchasePrice: data.purchase_price,
      purchaseDate: data.purchase_date,
      location: data.location,
      obverseImage: data.obverse_image,
      reverseImage: data.reverse_image,
      personalImages: data.personal_images as string[] || [],
      publicNote: data.public_note,
      privateNote: data.private_note,
      isForSale: data.is_for_sale,
      salePrice: data.sale_price,
      orderIndex: data.order_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
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

    return {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      banknote: {} as Banknote, // We don't have banknote data at this point
      condition: data.condition as BanknoteCondition,
      purchasePrice: data.purchase_price,
      purchaseDate: data.purchase_date,
      location: data.location,
      obverseImage: data.obverse_image,
      reverseImage: data.reverse_image,
      personalImages: data.personal_images as string[] || [],
      publicNote: data.public_note,
      privateNote: data.private_note,
      isForSale: data.is_for_sale,
      salePrice: data.sale_price,
      orderIndex: data.order_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error("Error creating collection item:", error);
    throw error;
  }
};

export const updateCollectionItem = async (itemId: string, data: Partial<CollectionItem>): Promise<boolean> => {
  try {
    // Convert client model to database model
    const updateData: any = {
      condition: data.condition,
      purchase_price: data.purchasePrice,
      purchase_date: data.purchaseDate,
      location: data.location,
      public_note: data.publicNote,
      private_note: data.privateNote,
      is_for_sale: data.isForSale,
      sale_price: data.salePrice,
      personal_images: data.personalImages
    };
    
    // Handle the date properly
    if (updateData.purchase_date && typeof updateData.purchase_date === 'object' && updateData.purchase_date.toISOString) {
      updateData.purchase_date = updateData.purchase_date.toISOString();
    }

    const { error } = await supabase
      .from('collection_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      console.error("Error updating collection item:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating collection item:", error);
    return false;
  }
};

export const updateCollectionItemImages = async (
  itemId: string, 
  obverseImage?: string, 
  reverseImage?: string
): Promise<boolean> => {
  try {
    const updateData: any = {};
    
    if (obverseImage !== undefined) {
      updateData.obverse_image = obverseImage;
    }
    
    if (reverseImage !== undefined) {
      updateData.reverse_image = reverseImage;
    }
    
    const { error } = await supabase
      .from('collection_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      console.error("Error updating collection item images:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating collection item images:", error);
    return false;
  }
};

export const uploadCollectionImage = async (file: File): Promise<string> => {
  if (!file) throw new Error('No file provided');
  
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `collection-images/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('banknote_images')
      .upload(filePath, file);
      
    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('banknote_images')
      .getPublicUrl(filePath);
      
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
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

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      banknote: item.banknote as Banknote,
      condition: item.condition as BanknoteCondition,
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      location: item.location,
      obverseImage: item.obverse_image,
      reverseImage: item.reverse_image,
      personalImages: item.personal_images as string[] || [],
      publicNote: item.public_note,
      privateNote: item.private_note,
      isForSale: item.is_for_sale,
      salePrice: item.sale_price,
      orderIndex: item.order_index,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  } catch (error) {
    console.error("Error fetching collection:", error);
    throw error;
  }
};
