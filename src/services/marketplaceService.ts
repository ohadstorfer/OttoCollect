
/**
 * Get marketplace item by id
 */
export const getMarketplaceItemById = async (id: string): Promise<MarketplaceItem | null> => {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        id,
        status,
        created_at,
        seller_id,
        collection_item_id,
        collection_items (
          id,
          user_id,
          banknote_id,
          condition,
          sale_price,
          public_note,
          private_note,
          is_for_sale,
          order_index,
          created_at,
          updated_at,
          obverse_image,
          reverse_image,
          detailed_banknotes (*)
        ),
        profiles (
          id,
          username,
          avatar_url,
          rank
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching marketplace item:', error);
      return null;
    }

    if (!data) return null;

    // Map the data to our MarketplaceItem type
    return {
      id: data.id,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.created_at,
      sellerId: data.seller_id,
      collectionItemId: data.collection_item_id,
      collectionItem: {
        id: data.collection_items.id,
        userId: data.collection_items.user_id,
        banknoteId: data.collection_items.banknote_id,
        condition: data.collection_items.condition,
        salePrice: data.collection_items.sale_price,
        publicNote: data.collection_items.public_note,
        privateNote: data.collection_items.private_note,
        isForSale: data.collection_items.is_for_sale,
        orderIndex: data.collection_items.order_index,
        createdAt: data.collection_items.created_at,
        updatedAt: data.collection_items.updated_at,
        obverseImage: data.collection_items.obverse_image,
        reverseImage: data.collection_items.reverse_image,
        banknote: data.collection_items.detailed_banknotes
      },
      seller: {
        id: data.profiles.id,
        username: data.profiles.username,
        avatarUrl: data.profiles.avatar_url,
        rank: data.profiles.rank
      }
    };
  } catch (err) {
    console.error('Error in getMarketplaceItemById:', err);
    return null;
  }
};
