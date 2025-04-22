
import { supabase } from '@/integrations/supabase/client';
import { CollectionItem, Banknote, BanknoteCondition } from '@/types';

// Function to fetch all collection items for a specific user
export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        id,
        userId:user_id,
        banknoteId:banknote_id,
        condition,
        purchasePrice:purchase_price,
        purchaseDate:purchase_date,
        location,
        obverseImage:obverse_image,
        reverseImage:reverse_image,
        personalImages:personal_images,
        publicNote:public_note,
        privateNote:private_note,
        isForSale:is_for_sale,
        salePrice:sale_price,
        orderIndex:order_index,
        createdAt:created_at,
        updatedAt:updated_at,
        banknote:banknote_id (
          *
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collection items:', error);
      return [];
    }

    if (!data) {
      console.log('No collection items found for user.');
      return [];
    }

    // Map database fields to client-side model
    return data.map(item => mapCollectionItemFromDatabase(item));
  } catch (error) {
    console.error('Unexpected error in fetchUserCollectionItems:', error);
    return [];
  }
}

// Function to fetch a single collection item by ID
export async function fetchCollectionItemById(itemId: string): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        id,
        userId:user_id,
        banknoteId:banknote_id,
        condition,
        purchasePrice:purchase_price,
        purchaseDate:purchase_date,
        location,
        obverseImage:obverse_image,
        reverseImage:reverse_image,
        personalImages:personal_images,
        publicNote:public_note,
        privateNote:private_note,
        isForSale:is_for_sale,
        salePrice:sale_price,
        orderIndex:order_index,
        createdAt:created_at,
        updatedAt:updated_at,
        banknote:banknote_id (
          *
        )
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('Error fetching collection item by ID:', error);
      return null;
    }

    if (!data) {
      console.log(`No collection item found with ID: ${itemId}`);
      return null;
    }

    // Map database fields to client-side model
    return mapCollectionItemFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in fetchCollectionItemById:', error);
    return null;
  }
}

// Function to create a new collection item
export async function createCollectionItem(
  userId: string,
  banknoteId: string,
  condition: BanknoteCondition,
  purchasePrice?: number,
  purchaseDate?: string,
  location?: string,
  obverseImage?: string,
  reverseImage?: string,
  personalImages?: string[],
  publicNote?: string,
  privateNote?: string,
  isForSale: boolean = false,
  salePrice?: number,
  orderIndex?: number
): Promise<CollectionItem | null> {
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
          order_index: orderIndex
        }
      ])
      .select(`
        id,
        userId:user_id,
        banknoteId:banknote_id,
        condition,
        purchasePrice:purchase_price,
        purchaseDate:purchase_date,
        location,
        obverseImage:obverse_image,
        reverseImage:reverse_image,
        personalImages:personal_images,
        publicNote:public_note,
        privateNote:private_note,
        isForSale:is_for_sale,
        salePrice:sale_price,
        orderIndex:order_index,
        createdAt:created_at,
        updatedAt:updated_at,
        banknote:banknote_id (
          *
        )
      `)
      .single();

    if (error) {
      console.error('Error creating collection item:', error);
      return null;
    }

    // Map database fields to client-side model
    return mapCollectionItemFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in createCollectionItem:', error);
    return null;
  }
}

// Add missing function to handle Banknote categories and types extraction
export async function fetchBanknoteCategoriesAndTypes(items: CollectionItem[]) {
  // Helper function to get unique values by property
  const getUniqueByProperty = (array: CollectionItem[], key: string) => {
    const unique = new Map();
    
    array.forEach(item => {
      if (item.banknote && item.banknote[key as keyof typeof item.banknote]) {
        // Make sure the property exists before trying to access it
        const value = item.banknote[key as keyof typeof item.banknote];
        if (!unique.has(value)) {
          unique.set(value, {
            id: value,
            name: value,
            count: 1
          });
        } else {
          const existing = unique.get(value);
          existing.count += 1;
          unique.set(value, existing);
        }
      }
    });
    
    return Array.from(unique.values());
  };
  
  const categories = getUniqueByProperty(items, 'category');
  const types = getUniqueByProperty(items, 'type');
  
  return { categories, types };
}

export async function updateCollectionItem(itemId: string, updates: {
  condition?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  privateNote?: string;
  publicNote?: string;
  isForSale?: boolean;
  salePrice?: number | null;
  location?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .update({
        condition: updates.condition,
        purchase_date: updates.purchaseDate,
        purchase_price: updates.purchasePrice,
        private_note: updates.privateNote,
        public_note: updates.publicNote,
        is_for_sale: updates.isForSale,
        sale_price: updates.salePrice,
        location: updates.location,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);
      
    if (error) {
      console.error('Error updating collection item:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error in updateCollectionItem:', error);
    return false;
  }
}

// Function to update the images of a collection item
export async function updateCollectionItemImages(itemId: string, obverseImage?: string, reverseImage?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .update({
        obverse_image: obverseImage,
        reverse_image: reverseImage
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating collection item images:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in updateCollectionItemImages:', error);
    return false;
  }
}

// Function to delete a collection item
export async function deleteCollectionItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting collection item:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in deleteCollectionItem:', error);
    return false;
  }
}

// Helper function to map database fields to client-side model
function mapCollectionItemFromDatabase(item: any): CollectionItem {
  return {
    id: item.id,
    userId: item.userId,
    banknoteId: item.banknoteId,
    banknote: item.banknote,
    condition: item.condition,
    purchasePrice: item.purchasePrice,
    purchaseDate: item.purchaseDate,
    location: item.location,
    obverseImage: item.obverseImage,
    reverseImage: item.reverseImage,
    personalImages: item.personalImages,
    publicNote: item.publicNote,
    privateNote: item.privateNote,
    isForSale: item.isForSale,
    salePrice: item.salePrice,
    orderIndex: item.orderIndex,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  } as CollectionItem;
}

// Add explicit exports for functions that are being imported elsewhere
export function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  return fetchUserCollectionItems(userId);
}

export function uploadCollectionImage(file: File, userId: string, collectionItemId?: string): Promise<string> {
  // Implementation of uploadCollectionImage function
  return Promise.resolve('image_url_placeholder');
}

// Helper function for date formatting
export const formatDate = (dateValue: string | Date | null): string | null => {
  if (!dateValue) return null;
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toISOString();
  } catch (error) {
    console.error('Invalid date format:', error);
    return null;
  }
};
