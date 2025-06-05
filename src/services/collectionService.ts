import { supabase } from '@/integrations/supabase/client';
import { CollectionItem, DetailedBanknote } from '@/types';
import { mapBanknoteFromDatabase } from './banknoteService';

export async function fetchUserCollectionByCountry(
  userId: string,
  countryId: string
): Promise<CollectionItem[]> {
  console.log('fetchUserCollectionByCountry called with:', { userId, countryId });
  
  try {
    // First get the country name
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();

    if (countryError || !country) {
      console.error('Error fetching country:', countryError);
      return [];
    }

    console.log('Country found:', country.name);

    // Query collection items for this user
    const { data: collectionItems, error: collectionError } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknotes!collection_items_banknote_id_fkey(*),
        unlisted_banknote:unlisted_banknotes!collection_items_unlisted_banknotes_id_fkey(*)
      `)
      .eq('user_id', userId);

    if (collectionError) {
      console.error('Error fetching collection items:', collectionError);
      return [];
    }

    console.log('Raw collection items:', collectionItems);

    // Now we need to filter and join with enhanced banknote data
    const processedItems: CollectionItem[] = [];

    for (const item of collectionItems || []) {
      if (item.is_unlisted_banknote) {
        // Handle unlisted banknotes
        if (item.unlisted_banknote && item.unlisted_banknote.country === country.name) {
          processedItems.push({
            id: item.id,
            userId: item.user_id,
            banknoteId: item.unlisted_banknotes_id,
            isUnlistedBanknote: true,
            salePrice: item.sale_price,
            isForSale: item.is_for_sale,
            purchasePrice: item.purchase_price,
            purchaseDate: item.purchase_date,
            orderIndex: item.order_index,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            condition: item.condition,
            publicNote: item.public_note,
            privateNote: item.private_note,
            location: item.location,
            obverseImage: item.obverse_image,
            reverseImage: item.reverse_image,
            grade: item.grade,
            grade_by: item.grade_by,
            grade_condition_description: item.grade_condition_description,
            banknote: {
              ...mapBanknoteFromDatabase(item.unlisted_banknote),
              name: item.unlisted_banknote.name
            } as any
          });
        }
      } else {
        // Handle regular banknotes - fetch from enhanced view
        if (item.banknote_id) {
          const { data: enhancedBanknote, error: enhancedError } = await supabase
            .from('enhanced_detailed_banknotes')
            .select('*')
            .eq('id', item.banknote_id)
            .eq('country', country.name)
            .single();

          if (enhancedError) {
            console.log('Banknote not found in enhanced view or not in target country:', enhancedError);
            continue;
          }

          if (enhancedBanknote) {
            processedItems.push({
              id: item.id,
              userId: item.user_id,
              banknoteId: item.banknote_id,
              isUnlistedBanknote: false,
              salePrice: item.sale_price,
              isForSale: item.is_for_sale,
              purchasePrice: item.purchase_price,
              purchaseDate: item.purchase_date,
              orderIndex: item.order_index,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              condition: item.condition,
              publicNote: item.public_note,
              privateNote: item.private_note,
              location: item.location,
              obverseImage: item.obverse_image,
              reverseImage: item.reverse_image,
              grade: item.grade,
              grade_by: item.grade_by,
              grade_condition_description: item.grade_condition_description,
              banknote: mapBanknoteFromDatabase(enhancedBanknote)
            });
          }
        }
      }
    }

    console.log('Processed collection items:', processedItems.length);
    return processedItems;

  } catch (error) {
    console.error('Unexpected error in fetchUserCollectionByCountry:', error);
    return [];
  }
}

export async function fetchCollectionItem(itemId: string): Promise<CollectionItem | null> {
  try {
    console.log('[fetchCollectionItem] Fetching collection item with ID:', itemId);
    
    const { data: item, error } = await supabase
      .from('collection_items')
      .select(`
        *,
        banknote:banknotes!collection_items_banknote_id_fkey(*),
        unlisted_banknote:unlisted_banknotes!collection_items_unlisted_banknotes_id_fkey(*)
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('[fetchCollectionItem] Error fetching collection item:', error);
      return null;
    }

    if (!item) {
      console.log('[fetchCollectionItem] No collection item found with ID:', itemId);
      return null;
    }

    console.log('[fetchCollectionItem] Raw collection item data:', item);

    // If this is a regular banknote, fetch enhanced data
    let banknoteData;
    if (!item.is_unlisted_banknote && item.banknote_id) {
      console.log('[fetchCollectionItem] Fetching enhanced banknote data for ID:', item.banknote_id);
      
      const { data: enhancedBanknote, error: enhancedError } = await supabase
        .from('enhanced_detailed_banknotes')
        .select('*')
        .eq('id', item.banknote_id)
        .single();

      if (enhancedError) {
        console.error('[fetchCollectionItem] Error fetching enhanced banknote data:', enhancedError);
        console.log('[fetchCollectionItem] Falling back to regular banknote data');
        banknoteData = mapBanknoteFromDatabase(item.banknote);
      } else {
        console.log('[fetchCollectionItem] Enhanced banknote data received:', enhancedBanknote);
        banknoteData = mapBanknoteFromDatabase(enhancedBanknote);
      }
    } else if (item.is_unlisted_banknote && item.unlisted_banknote) {
      console.log('[fetchCollectionItem] Processing unlisted banknote');
      banknoteData = {
        ...mapBanknoteFromDatabase(item.unlisted_banknote),
        name: item.unlisted_banknote.name
      } as any;
    }

    console.log('[fetchCollectionItem] Final processed banknote data:', banknoteData);

    const collectionItem = {
      id: item.id,
      userId: item.user_id,
      banknoteId: item.is_unlisted_banknote ? item.unlisted_banknotes_id : item.banknote_id,
      is_unlisted_banknote: item.is_unlisted_banknote,
      salePrice: item.sale_price,
      isForSale: item.is_for_sale,
      purchasePrice: item.purchase_price,
      purchaseDate: item.purchase_date,
      orderIndex: item.order_index,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      condition: item.condition,
      publicNote: item.public_note,
      privateNote: item.private_note,
      location: item.location,
      obverseImage: item.obverse_image,
      reverseImage: item.reverse_image,
      grade: item.grade,
      grade_by: item.grade_by,
      grade_condition_description: item.grade_condition_description,
      banknote: banknoteData || null
    };

    console.log('[fetchCollectionItem] Final collection item result:', collectionItem);
    console.log('[fetchCollectionItem] Collection item banknote stamp URLs:');
    console.log('  - signaturePictureUrls:', collectionItem.banknote?.signaturePictureUrls);
    console.log('  - sealPictureUrls:', collectionItem.banknote?.sealPictureUrls);
    console.log('  - watermarkUrl:', collectionItem.banknote?.watermarkUrl);

    return collectionItem;

  } catch (error) {
    console.error('[fetchCollectionItem] Unexpected error:', error);
    return null;
  }
}

export async function addToCollection(banknoteId: string, userId: string): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .insert({
      banknote_id: banknoteId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add banknote to collection: ${error.message}`);
  }

  return data;
}

export async function removeFromCollection(collectionItemId: string): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', collectionItemId);

  if (error) {
    throw new Error(`Failed to remove banknote from collection: ${error.message}`);
  }
}

export async function updateCollectionItem(
  itemId: string,
  updates: Partial<CollectionItem>
): Promise<CollectionItem> {
  const { data, error } = await supabase
    .from('collection_items')
    .update({
      condition: updates.condition,
      public_note: updates.publicNote,
      private_note: updates.privateNote,
      location: updates.location,
      purchase_price: updates.purchasePrice,
      purchase_date: updates.purchaseDate,
      sale_price: updates.salePrice,
      is_for_sale: updates.isForSale,
      obverse_image: updates.obverseImage,
      reverse_image: updates.reverseImage,
      grade: updates.grade,
      grade_by: updates.grade_by,
      grade_condition_description: updates.grade_condition_description,
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update collection item: ${error.message}`);
  }

  return data;
}
