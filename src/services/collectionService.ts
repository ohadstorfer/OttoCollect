import { supabase } from '@/integrations/supabase/client';
import { CollectionItem, Banknote, BanknoteCondition, DetailedBanknote } from '@/types';

export async function fetchUserCollectionItems(userId: string): Promise<CollectionItem[]> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        id,
        user_id,
        banknote_id,
        condition,
        purchase_price,
        purchase_date,
        location,
        obverse_image,
        reverse_image,
        personal_images,
        public_note,
        private_note,
        is_for_sale,
        sale_price,
        order_index,
        created_at,
        updated_at,
        banknotes (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching collection items:', error);
      return [];
    }

    // Map the data to the CollectionItem interface
    const collectionItems: CollectionItem[] = data.map(item => ({
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      banknote: item.banknotes as Banknote, // Include the fetched banknote data
      condition: item.condition as BanknoteCondition,
      purchasePrice: item.purchase_price || undefined,
      purchaseDate: item.purchase_date || undefined,
      location: item.location || undefined,
      obverseImage: item.obverse_image || undefined,
      reverseImage: item.reverse_image || undefined,
      personalImages: item.personal_images || [],
      publicNote: item.public_note || undefined,
      privateNote: item.private_note || undefined,
      isForSale: item.is_for_sale,
      salePrice: item.sale_price || undefined,
      orderIndex: item.order_index || undefined,
      createdAt: item.created_at || undefined,
      updatedAt: item.updated_at || undefined,
    }));

    return collectionItems;
  } catch (error) {
    console.error('Unexpected error in fetchUserCollectionItems:', error);
    return [];
  }
}

export async function fetchCollectionItemById(id: string): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .select(`
        id,
        user_id,
        banknote_id,
        condition,
        purchase_price,
        purchase_date,
        location,
        obverse_image,
        reverse_image,
        personal_images,
        public_note,
        private_note,
        is_for_sale,
        sale_price,
        order_index,
        created_at,
        updated_at,
        banknotes (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching collection item by ID:', error);
      return null;
    }

    if (!data) {
      console.log(`No collection item found with ID: ${id}`);
      return null;
    }

    // Map the data to the CollectionItem interface
    const collectionItem: CollectionItem = {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      banknote: data.banknotes as Banknote, // Include the fetched banknote data
      condition: data.condition as BanknoteCondition,
      purchasePrice: data.purchase_price || undefined,
      purchaseDate: data.purchase_date || undefined,
      location: data.location || undefined,
      obverseImage: data.obverse_image || undefined,
      reverseImage: data.reverse_image || undefined,
      personalImages: data.personal_images || [],
      publicNote: data.public_note || undefined,
      privateNote: data.private_note || undefined,
      isForSale: data.is_for_sale,
      salePrice: data.sale_price || undefined,
      orderIndex: data.order_index || undefined,
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };

    return collectionItem;
  } catch (error) {
    console.error('Unexpected error in fetchCollectionItemById:', error);
    return null;
  }
}

export async function insertCollectionItem(collectionItem: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .insert({
        user_id: collectionItem.userId,
        banknote_id: collectionItem.banknoteId,
        condition: collectionItem.condition,
        purchase_price: collectionItem.purchasePrice,
        purchase_date: collectionItem.purchaseDate,
        location: collectionItem.location,
        obverse_image: collectionItem.obverseImage,
        reverse_image: collectionItem.reverseImage,
        personal_images: collectionItem.personalImages,
        public_note: collectionItem.publicNote,
        private_note: collectionItem.privateNote,
        is_for_sale: collectionItem.isForSale,
        sale_price: collectionItem.salePrice,
        order_index: collectionItem.orderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting collection item:', error);
      return null;
    }

    // Map the inserted data to the CollectionItem interface
    const insertedItem: CollectionItem = {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      banknote: collectionItem.banknote,
      condition: data.condition,
      purchasePrice: data.purchase_price || undefined,
      purchaseDate: data.purchase_date || undefined,
      location: data.location || undefined,
      obverseImage: data.obverse_image || undefined,
      reverseImage: data.reverse_image || undefined,
      personalImages: data.personal_images || [],
      publicNote: data.public_note || undefined,
      privateNote: data.private_note || undefined,
      isForSale: data.is_for_sale,
      salePrice: data.sale_price || undefined,
      orderIndex: data.order_index || undefined,
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };

    return insertedItem;
  } catch (error) {
    console.error('Unexpected error in insertCollectionItem:', error);
    return null;
  }
}

export async function updateCollectionItem(id: string, collectionItem: Partial<CollectionItem>): Promise<CollectionItem | null> {
  try {
    const { data, error } = await supabase
      .from('collection_items')
      .update({
        condition: collectionItem.condition,
        purchase_price: collectionItem.purchasePrice,
        purchase_date: collectionItem.purchaseDate,
        location: collectionItem.location,
        obverse_image: collectionItem.obverseImage,
        reverse_image: collectionItem.reverseImage,
        personal_images: collectionItem.personalImages,
        public_note: collectionItem.publicNote,
        private_note: collectionItem.privateNote,
        is_for_sale: collectionItem.isForSale,
        sale_price: collectionItem.salePrice,
        order_index: collectionItem.orderIndex,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating collection item:', error);
      return null;
    }

    // Map the updated data to the CollectionItem interface
    const updatedItem: CollectionItem = {
      id: data.id,
      userId: data.user_id,
      banknoteId: data.banknote_id,
      banknote: collectionItem.banknote as Banknote,
      condition: data.condition,
      purchasePrice: data.purchase_price || undefined,
      purchaseDate: data.purchase_date || undefined,
      location: data.location || undefined,
      obverseImage: data.obverse_image || undefined,
      reverseImage: data.reverse_image || undefined,
      personalImages: data.personal_images || [],
      publicNote: data.public_note || undefined,
      privateNote: data.private_note || undefined,
      isForSale: data.is_for_sale,
      salePrice: data.sale_price || undefined,
      orderIndex: data.order_index || undefined,
      createdAt: data.created_at || undefined,
      updatedAt: data.updated_at || undefined,
    };

    return updatedItem;
  } catch (error) {
    console.error('Unexpected error in updateCollectionItem:', error);
    return null;
  }
}

export async function deleteCollectionItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('collection_items')
      .delete()
      .eq('id', id);

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

// Helper function to extract categories and types from collection items
export async function fetchBanknoteCategoriesAndTypes(
  collectionItems: CollectionItem[]
): Promise<{
  categories: { id: string; name: string; count: number }[];
  types: { id: string; name: string; count: number }[];
}> {
  // Group by category
  const groupByCategory = (banknotes: Banknote[]) => {
    const groups: { [key: string]: Banknote[] } = {};
    banknotes.forEach(banknote => {
      const category = banknote.category || 'Uncategorized';
      if (!groups[category]) groups[category] = [];
      groups[category].push(banknote);
    });
    return groups;
  };

  // Group by type
  const groupByType = (banknotes: Banknote[]) => {
    const groups: { [key: string]: Banknote[] } = {};
    banknotes.forEach(banknote => {
      const type = banknote.type || 'Uncategorized';
      if (!groups[type]) groups[type] = [];
      groups[type].push(banknote);
    });
    return groups;
  };

  // Extract banknotes from collection items
  const banknotes = collectionItems.map(item => item.banknote);

  // Group banknotes by category and type
  const categoriesGrouped = groupByCategory(banknotes);
  const typesGrouped = groupByType(banknotes);

  // Convert category groups to desired format
  const categories = Object.entries(categoriesGrouped).map(([name, items]) => ({
    name,
    id: name, // You might want to generate a unique ID here
    count: items.length,
  }));

  // Convert type groups to desired format
  const types = Object.entries(typesGrouped).map(([name, items]) => ({
    name,
    id: name, // You might want to generate a unique ID here
    count: items.length,
  }));

  return { categories, types };
}

interface CollectionItemInsert {
  user_id: string;
  banknote_id: string;
  condition: BanknoteCondition;
  purchase_price?: number;
  purchase_date?: string;
  location?: string;
  obverse_image?: string;
  reverse_image?: string;
  personal_images?: string[];
  public_note?: string;
  private_note?: string;
  is_for_sale: boolean;
  sale_price?: number;
  order_index?: number;
}

export async function saveCollectionItem(collectionItem: CollectionItem): Promise<CollectionItem | null> {
  try {
    const formattedItem: CollectionItemInsert = {
      user_id: collectionItem.userId,
      banknote_id: collectionItem.banknoteId,
      condition: collectionItem.condition,
      is_for_sale: collectionItem.isForSale,
      location: collectionItem.location,
      obverse_image: collectionItem.obverseImage,
      personal_images: collectionItem.personalImages,
      private_note: collectionItem.privateNote,
      public_note: collectionItem.publicNote,
      purchase_price: collectionItem.purchasePrice,
      reverse_image: collectionItem.reverseImage,
      sale_price: collectionItem.salePrice,
      order_index: collectionItem.orderIndex,
    };

    // Convert purchase date
    if (collectionItem.purchaseDate) {
      const purchaseDate = new Date(collectionItem.purchaseDate);
      if (!isNaN(purchaseDate.getTime())) {  // Check if it's a valid date
        formattedItem.purchase_date = purchaseDate.toISOString();
      }
    }

    let data, error;

    if (collectionItem.id) {
      // Update existing item
      const updateResult = await supabase
        .from('collection_items')
        .update(formattedItem)
        .eq('id', collectionItem.id)
        .select()
        .single();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      // Insert new item
      const insertResult = await supabase
        .from('collection_items')
        .insert(formattedItem)
        .select()
        .single();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Error saving collection item:', error);
      return null;
    }

    return data as CollectionItem;
  } catch (error) {
    console.error('Unexpected error in saveCollectionItem:', error);
    return null;
  }
}
