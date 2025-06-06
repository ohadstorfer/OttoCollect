
import { supabase } from '@/integrations/supabase/client';
import { CollectionItem, DetailedBanknote } from '@/types';
import { mapBanknoteFromDatabase } from './banknoteService';

// Function to upload collection item images to Supabase storage
export const uploadCollectionImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('collection_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('collection_images')
      .getPublicUrl(data.path);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

// Function to add a banknote to a user's collection
export const addToCollection = async ({
  userId,
  banknoteId,
  condition,
  grade_by,
  grade,
  grade_condition_description,
  purchasePrice,
  purchaseDate,
  location,
  obverseImage,
  reverseImage,
  personalImages,
  publicNote,
  privateNote,
  isForSale = false,
  salePrice,
  orderIndex,
  is_unlisted_banknote = false
}: {
  userId: string;
  banknoteId: string;
  condition?: string;
  grade_by?: string;
  grade?: string;
  grade_condition_description?: string;
  purchasePrice?: number;
  purchaseDate?: string | Date;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  personalImages?: string[];
  publicNote?: string;
  privateNote?: string;
  isForSale?: boolean;
  salePrice?: number;
  orderIndex?: number;
  is_unlisted_banknote?: boolean;
}): Promise<CollectionItem | null> => {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert([
        {
          user_id: userId,
          banknote_id: banknoteId,
          condition,
          grade_by,
          grade,
          grade_condition_description,
          purchase_price: purchasePrice,
          purchase_date: purchaseDate,
          location,
          obverse_image: obverseImage,
          reverse_image: reverseImage,
          personal_images: personalImages,
          public_note: publicNote,
          private_note: privateNote,
          is_for_sale: isForSale,
          sale_price: salePrice,
          order_index: orderIndex,
          is_unlisted_banknote
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error adding to collection:', error);
      return null;
    }

    return data as CollectionItem;
  } catch (error) {
    console.error('Unexpected error in addToCollection:', error);
    return null;
  }
};

export async function fetchCollectionItem(itemId: string): Promise<CollectionItem | null> {
  try {
    console.log("Fetching collection item with ID:", itemId);
    
    // First get the collection item
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (collectionError) {
      console.error('Error fetching collection item:', collectionError);
      return null;
    }

    if (!collectionData) {
      console.log('No collection item found with ID:', itemId);
      return null;
    }

    console.log("Collection item data:", collectionData);

    let banknoteData = null;

    if (collectionData.is_unlisted_banknote && collectionData.unlisted_banknotes_id) {
      // Fetch from unlisted_banknotes table
      const { data: unlistedData, error: unlistedError } = await supabase
        .from('unlisted_banknotes')
        .select('*')
        .eq('id', collectionData.unlisted_banknotes_id)
        .single();

      if (unlistedError) {
        console.error('Error fetching unlisted banknote:', unlistedError);
        return null;
      }

      banknoteData = unlistedData;
      console.log("Unlisted banknote data:", banknoteData);
    } else if (collectionData.banknote_id) {
      // Fetch from enhanced_detailed_banknotes view to get resolved URLs
      const { data: detailedData, error: detailedError } = await supabase
        .from('enhanced_detailed_banknotes')
        .select('*')
        .eq('id', collectionData.banknote_id)
        .single();

      if (detailedError) {
        console.error('Error fetching detailed banknote:', detailedError);
        return null;
      }

      banknoteData = detailedData;
      console.log("Enhanced detailed banknote data with resolved URLs:", banknoteData);
      console.log("Resolved URLs check:", {
        signature_picture_urls: banknoteData?.signature_picture_urls,
        seal_picture_urls: banknoteData?.seal_picture_urls,
        watermark_picture_url: banknoteData?.watermark_picture_url
      });
    }

    if (!banknoteData) {
      console.error('No banknote data found for collection item');
      return null;
    }

    // Map the banknote data to our DetailedBanknote type
    const mappedBanknote = mapBanknoteFromDatabase(banknoteData);
    console.log("Mapped banknote with resolved URLs:", {
      id: mappedBanknote.id,
      signaturePictureUrls: mappedBanknote.signaturePictureUrls,
      sealPictureUrls: mappedBanknote.sealPictureUrls,
      watermarkUrl: mappedBanknote.watermarkUrl
    });

    const collectionItem: CollectionItem = {
      id: collectionData.id,
      userId: collectionData.user_id,
      banknoteId: collectionData.banknote_id || '',
      banknote: mappedBanknote,
      condition: collectionData.condition,
      grade_by: collectionData.grade_by,
      grade: collectionData.grade,
      grade_condition_description: collectionData.grade_condition_description,
      purchasePrice: collectionData.purchase_price,
      purchaseDate: collectionData.purchase_date,
      location: collectionData.location,
      obverseImage: collectionData.obverse_image,
      reverseImage: collectionData.reverse_image,
      personalImages: [],
      publicNote: collectionData.public_note,
      privateNote: collectionData.private_note,
      isForSale: collectionData.is_for_sale,
      salePrice: collectionData.sale_price,
      orderIndex: collectionData.order_index,
      createdAt: collectionData.created_at,
      updatedAt: collectionData.updated_at,
      is_unlisted_banknote: collectionData.is_unlisted_banknote,
    };

    console.log("Final collection item with banknote resolved URLs:", {
      id: collectionItem.id,
      banknoteSignatureUrls: collectionItem.banknote?.signaturePictureUrls,
      banknoteSealUrls: collectionItem.banknote?.sealPictureUrls,
      banknoteWatermarkUrl: collectionItem.banknote?.watermarkUrl
    });

    return collectionItem;
  } catch (error) {
    console.error('Unexpected error in fetchCollectionItem:', error);
    return null;
  }
}

// Function to remove a banknote from a user's collection
export const removeFromCollection = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error removing from collection:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in removeFromCollection:', error);
    return false;
  }
};

// Function to update a collection item
export const updateCollectionItem = async (
  itemId: string,
  updates: Partial<CollectionItem>
): Promise<CollectionItem | null> => {
  try {
    // Convert purchaseDate to ISO string if it's a Date object
    if (updates.purchaseDate instanceof Date) {
      updates.purchaseDate = updates.purchaseDate.toISOString();
    }

    const { data, error } = await supabase
      .from('collection_items')
      .update(updates)
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating collection item:', error);
      return null;
    }

    return data as CollectionItem;
  } catch (error) {
    console.error('Unexpected error in updateCollectionItem:', error);
    return null;
  }
};

export const fetchCollection = async (userId: string): Promise<CollectionItem[]> => {
  try {
    console.log(`Fetching collection for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching collection:', error);
      return [];
    }

    console.log(`Fetched ${data.length} collection items for user ID: ${userId}`);

    return data as CollectionItem[];
  } catch (error) {
    console.error('Unexpected error in fetchCollection:', error);
    return [];
  }
};
