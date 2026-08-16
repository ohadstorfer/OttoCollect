// This fixes the conversion from the Supabase seller format to the User type in MarketplaceItem
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceItem, UserRank, User, BanknoteCondition } from "@/types";
import { fetchCollectionItem } from "./collectionService";
import { normalizeBanknoteData } from "@/services/collectionService";
import { mapBanknoteFromDatabase } from "@/services/banknoteService";
import { isListingArchived } from '@/lib/marketplaceListing';
import { createPendingDomainRequest, normalizeDomain } from '@/services/approvedDomainsService';
import type { ListingCurrency, ListingType } from '@/types';

// Add user type adaptations to fix typescript errors
const adaptSellerToUserType = (seller: { 
  id: string; 
  username: string; 
  rank: string; 
  avatar_url: string | null; 
}): User => {
  return {
    id: seller.id,
    username: seller.username,
    email: "", // Required by User type
    avatarUrl: seller.avatar_url || undefined,
    role_id: "", // Required by User type 
    role: "User", // Default role
    rank: seller.rank as UserRank,
    points: 0, // Default points
    createdAt: new Date().toISOString(), // Default creation date
  };
};

export async function fetchMarketplaceItems(currentUserId?: string): Promise<MarketplaceItem[]> {
  try {

    // Fetch published items plus Draft/PendingUrl rows; the latter are kept
    // only when they belong to currentUserId (pinned owner block, spec §8.3).
    const { data: marketplaceItems, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_items!inner (
          *,
          public_note_ar,
          public_note_tr,
          public_note_en,
          public_note_original_language,
          location_ar,
          location_tr,
          location_en,
          type_ar,
          type_en,
          type_tr,
          enhanced_banknotes_with_translations:banknote_id (*),
          unlisted_banknotes:unlisted_banknotes_id (*)
        )
      `)
      .in('status', ['Available', 'Draft', 'PendingUrl']);

    if (error) {
      console.error("Error fetching marketplace items:", error);
      throw error;
    }
    
    
    if (!marketplaceItems || marketplaceItems.length === 0) {
      return [];
    }
    
    // Process the marketplace items
    const enrichedItems = await Promise.all(
      marketplaceItems.map(async (item) => {
        try {
          
          const collectionItem = item.collection_items;
          if (!collectionItem) {
            return null;
          }

          // Draft / PendingUrl rows are visible only to their owner.
          if (item.status !== 'Available' && item.seller_id !== currentUserId) {
            return null;
          }
          // Published items must still be flagged for sale on the collection item.
          if (item.status === 'Available' && !collectionItem.is_for_sale) {
            return null;
          }

          // Get banknote data based on whether it's an unlisted banknote or not
          let banknote;
          if (collectionItem.is_unlisted_banknote && collectionItem.unlisted_banknotes) {
            banknote = normalizeBanknoteData(collectionItem.unlisted_banknotes, "unlisted");
          } else if (!collectionItem.is_unlisted_banknote && collectionItem.enhanced_banknotes_with_translations) {
            banknote = normalizeBanknoteData(mapBanknoteFromDatabase(collectionItem.enhanced_banknotes_with_translations), "detailed");
          }

          if (!banknote) {
            return null;
          }
          
          // Get basic seller info
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('id, username, rank, role, avatar_url, selected_language')
            .eq('id', item.seller_id)
            .single();
          
          if (sellerError) {
            console.log(`Error fetching seller data: ${sellerError.message}`);
          }
          
          // Fallback seller data if we can't find the profile
          const sellerInfo = sellerData || {
            id: item.seller_id,
            username: "Unknown User",
            rank: "Newbie" as UserRank,
            avatar_url: null
          };
          
          // Convert seller data to User type
          const seller = adaptSellerToUserType(sellerInfo);
          
          
          return {
            id: item.id,
            collectionItemId: item.collection_item_id,
            collectionItem: {
              id: collectionItem.id,
              userId: collectionItem.user_id,
              banknoteId: collectionItem.banknote_id,
              banknote,
              condition: collectionItem.condition as BanknoteCondition,
              grade_by: collectionItem.grade_by,
      grade: collectionItem.grade,
      grade_condition_description: collectionItem.grade_condition_description,
              salePrice: collectionItem.sale_price,
              isForSale: collectionItem.is_for_sale,
              publicNote: collectionItem.public_note,
              public_note_original_language: collectionItem.public_note_original_language,
              privateNote: collectionItem.private_note,
              purchasePrice: collectionItem.purchase_price,
              purchaseDate: collectionItem.purchase_date,
              location: collectionItem.location,
              obverseImage: collectionItem.obverse_image,
              reverseImage: collectionItem.reverse_image,
              orderIndex: collectionItem.order_index,
              createdAt: collectionItem.created_at,
              updatedAt: collectionItem.updated_at,
              is_unlisted_banknote: collectionItem.is_unlisted_banknote
            },
            sellerId: item.seller_id,
            seller,
            status: item.status,
            external_listing_url: item.external_listing_url,
            is_url_approved: item.is_url_approved,
            listing_type: (item.listing_type ?? 'sale') as ListingType,
            currency: (item.currency ?? 'USD') as ListingCurrency,
            reference_code: item.reference_code,
            published_at: item.published_at,
            archived_at: item.archived_at,
            pending_url_domain: item.pending_url_domain,
            public_remark: item.public_remark,
            is_sold: item.is_sold ?? false,
            sold_at: item.sold_at,
            auction_at: item.auction_at,
            auction_timezone: item.auction_timezone,
            lot_number: item.lot_number,
            start_price: item.start_price,
            estimated_price: item.estimated_price,
            realized_price: item.realized_price,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          } as MarketplaceItem;
        } catch (error) {
          console.error(`Error processing marketplace item ${item.id}:`, error);
          return null;
        }
      })
    );

    const validItems = enrichedItems.filter(item => item !== null) as MarketplaceItem[];
    return validItems;
  } catch (error) {
    console.error("Error in fetchMarketplaceItems:", error);
    return [];
  }
}

export async function addToMarketplace(
  collectionItemId: string,
  userId: string
): Promise<boolean> {
  try {
    // First, check if the collection item exists and is not already for sale
    const { data: collectionItem, error: fetchError } = await supabase
      .from('collection_items')
      .select('*')
      .eq('id', collectionItemId)
      .single();
      
    if (fetchError) {
      console.error("Error fetching collection item:", fetchError);
      throw fetchError;
    }
    
    if (!collectionItem) {
      console.error("Collection item not found:", collectionItemId);
      return false;
    }
    
    // Update the collection item to mark as for sale
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ is_for_sale: true })
      .eq('id', collectionItemId);
      
    if (updateError) {
      console.error("Error updating collection item for marketplace:", updateError);
      throw updateError;
    }
    
    // Check if the item is already in the marketplace
    const { data: existingItem } = await supabase
      .from('marketplace_items')
      .select('id, status')
      .eq('collection_item_id', collectionItemId)
      .maybeSingle();
      
    if (existingItem) {
      // Item is already in marketplace, update its status if needed
      if (existingItem.status !== 'Available') {
        const { error } = await supabase
          .from('marketplace_items')
          .update({ status: 'Available' })
          .eq('id', existingItem.id);
          
        if (error) {
          console.error("Error updating existing marketplace item:", error);
          throw error;
        }
      }
      
      return true;
    }
    
    // Add the item to marketplace
    const newItem = {
      collection_item_id: collectionItemId,
      banknote_id: collectionItem.is_unlisted_banknote ? null : collectionItem.banknote_id,
      seller_id: userId,
      status: 'Available'
    };
    const { error } = await supabase
      .from('marketplace_items')
      .insert(newItem);
      
    if (error) {
      console.error("Error adding to marketplace:", error);
      // Roll back the update to the collection item
      await supabase
        .from('collection_items')
        .update({ is_for_sale: false })
        .eq('id', collectionItemId);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in addToMarketplace:", error);
    return false;
  }
}

export interface ListingInput {
  listingType: ListingType;
  currency: ListingCurrency;
  salePrice: number | null;
  publicRemark: string | null;
  externalListingUrl: string | null;
  isUrlApproved: boolean;
  isSold: boolean;
  auctionAt: string | null;
  auctionTimezone: string | null;
  lotNumber: string | null;
  startPrice: number | null;
  estimatedPrice: string | null;
  realizedPrice: number | null;
}

export type SaveListingResult = 'published' | 'draft' | 'pending-url' | 'error';

/**
 * Creates or updates the marketplace listing for a collection item.
 * publish=false saves it as a Draft (hidden from the marketplace,
 * collection item not flagged for sale).
 * Publishing an auction whose URL is not yet approved holds it as
 * 'PendingUrl' (spec §5.3): not on sale, auto-published by approve_domain().
 */
export async function saveMarketplaceListing(
  collectionItemId: string,
  sellerId: string,
  input: ListingInput,
  publish: boolean
): Promise<SaveListingResult> {
  try {
    const { data: collectionItem, error: ciError } = await supabase
      .from('collection_items')
      .select('id, banknote_id, is_unlisted_banknote')
      .eq('id', collectionItemId)
      .single();
    if (ciError || !collectionItem) throw ciError ?? new Error('Collection item not found');

    const { data: existing, error: existingError } = await supabase
      .from('marketplace_items')
      .select('id, sold_at, status, reference_code, published_at')
      .eq('collection_item_id', collectionItemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    const holdForUrl =
      publish &&
      input.listingType === 'auction' &&
      Boolean(input.externalListingUrl) &&
      !input.isUrlApproved;
    const status = !publish ? 'Draft' : holdForUrl ? 'PendingUrl' : 'Available';

    // Reference code (PDF §12): assigned once, on the first transition out of Draft.
    let referenceCode = (existing as any)?.reference_code ?? null;
    if (status !== 'Draft' && !referenceCode) {
      const { data: ref, error: refError } = await (supabase.rpc as any)(
        'next_marketplace_reference',
        { p_listing_type: input.listingType }
      );
      if (refError) console.error('Error allocating reference code:', refError);
      else referenceCode = ref ?? null;
    }

    const row: Record<string, unknown> = {
      listing_type: input.listingType,
      currency: input.currency,
      public_remark: input.publicRemark,
      external_listing_url: input.externalListingUrl,
      is_url_approved: input.isUrlApproved,
      is_sold: input.listingType === 'sale' ? input.isSold : false,
      sold_at:
        input.listingType === 'sale' && input.isSold
          ? existing?.sold_at ?? new Date().toISOString()
          : null,
      auction_at: input.listingType === 'auction' ? input.auctionAt : null,
      auction_timezone: input.listingType === 'auction' ? input.auctionTimezone : null,
      lot_number: input.listingType === 'auction' ? input.lotNumber : null,
      start_price: input.listingType === 'auction' ? input.startPrice : null,
      estimated_price: input.listingType === 'auction' ? input.estimatedPrice : null,
      realized_price: input.listingType === 'auction' ? input.realizedPrice : null,
      status,
      pending_url_domain:
        holdForUrl && input.externalListingUrl ? normalizeDomain(input.externalListingUrl) : null,
      reference_code: referenceCode,
      published_at:
        status === 'Available'
          ? (existing as any)?.published_at ?? new Date().toISOString()
          : (existing as any)?.published_at ?? null,
      // Saving/re-publishing always brings the listing back from the archive.
      archived_at: null,
      updated_at: new Date().toISOString(),
    };

    let marketplaceItemId = existing?.id ?? null;
    if (existing) {
      const { error } = await supabase
        .from('marketplace_items')
        .update(row as any)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from('marketplace_items')
        .insert({
          ...(row as any),
          collection_item_id: collectionItemId,
          seller_id: sellerId,
          banknote_id: collectionItem.is_unlisted_banknote ? null : collectionItem.banknote_id,
        })
        .select('id')
        .single();
      if (error) throw error;
      marketplaceItemId = (inserted as any)?.id ?? null;
    }

    const { error: updateError } = await supabase
      .from('collection_items')
      .update({
        is_for_sale: status === 'Available',
        sale_price: input.listingType === 'sale' ? input.salePrice : null,
      })
      .eq('id', collectionItemId);
    if (updateError) throw updateError;

    if (holdForUrl && input.externalListingUrl) {
      // Best-effort: queue the domain for Super-Admin approval (spec §5.3 step 2).
      await createPendingDomainRequest(
        sellerId,
        normalizeDomain(input.externalListingUrl),
        input.externalListingUrl,
        input.listingType,
        marketplaceItemId ?? undefined
      );
      return 'pending-url';
    }
    return publish ? 'published' : 'draft';
  } catch (error) {
    console.error('Error in saveMarketplaceListing:', error);
    return 'error';
  }
}

/** Owner-only inline toggle on Buy-now items (spec §8.2). RLS enforces sellership. */
export async function setListingSold(marketplaceItemId: string, isSold: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('marketplace_items')
    .update({
      is_sold: isSold,
      sold_at: isSold ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', marketplaceItemId);
  if (error) console.error('Error in setListingSold:', error);
  return !error;
}

/** Owner-only inline entry after an auction ends (spec §8.2). */
export async function setRealizedPrice(
  marketplaceItemId: string,
  price: number | null
): Promise<boolean> {
  const { error } = await supabase
    .from('marketplace_items')
    .update({ realized_price: price, updated_at: new Date().toISOString() } as any)
    .eq('id', marketplaceItemId);
  if (error) console.error('Error in setRealizedPrice:', error);
  return !error;
}

/** Owner-chosen archive (spec §9): non-destructive, item moves below the active list. */
export async function archiveListing(marketplaceItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('marketplace_items')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
    .eq('id', marketplaceItemId);
  if (error) console.error('Error in archiveListing:', error);
  return !error;
}

export async function removeFromMarketplace(
  collectionItemId: string,
  marketplaceItemId?: string
): Promise<boolean> {
  try {
    console.log('removeFromMarketplace called with:', { collectionItemId, marketplaceItemId });
    
    // If marketplaceItemId is provided, use it directly to delete the row
    if (marketplaceItemId) {
      console.log('Deleting marketplace item with ID:', marketplaceItemId);
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', marketplaceItemId);
        
      if (error) {
        console.error("Error removing from marketplace:", error);
        throw error;
      }
      console.log('Successfully deleted marketplace item');
    } else {
      // Otherwise, look up the marketplace item by collection_item_id and delete it
      console.log('Looking up marketplace item by collection_item_id:', collectionItemId);
      const { data: marketplaceItem, error: findError } = await supabase
        .from('marketplace_items')
        .select('id')
        .eq('collection_item_id', collectionItemId)
        .single();
      
      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error finding marketplace item:", findError);
        throw findError;
      }
      
      if (marketplaceItem) {
        console.log('Found marketplace item, deleting:', marketplaceItem.id);
        const { error } = await supabase
          .from('marketplace_items')
          .delete()
          .eq('id', marketplaceItem.id);
          
        if (error) {
          console.error("Error removing from marketplace:", error);
          throw error;
        }
        console.log('Successfully deleted marketplace item');
      }
    }
    
    // Update the collection item to mark as not for sale and reset sale_price to 0.00
    console.log('Updating collection item:', collectionItemId, 'to is_for_sale: false, sale_price: 0.00');
    const { error: updateError } = await supabase
      .from('collection_items')
      .update({ 
        is_for_sale: false,
        sale_price: 0.00
      })
      .eq('id', collectionItemId);
      
    if (updateError) {
      console.error("Error updating collection item from marketplace:", updateError);
      throw updateError;
    }
    
    console.log('Successfully updated collection item');
    return true;
  } catch (error) {
    console.error("Error in removeFromMarketplace:", error);
    return false;
  }
}

export async function getMarketplaceItemById(id: string): Promise<MarketplaceItem | null> {
  try {
    
    // Get the marketplace item by ID
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error("Error fetching marketplace item by ID:", error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Get collection item details
    const collectionItem = await fetchCollectionItem(data.collection_item_id);
    if (!collectionItem) {
      console.log(`Collection item not found: ${data.collection_item_id}`);
      return null;
    }
    
    // Get seller info
    const { data: sellerData, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, rank, avatar_url, selected_language')
      .eq('id', data.seller_id)
      .single();
      
    if (sellerError) {
      console.log(`Error fetching seller data: ${sellerError.message}`);
    }
    
    // Fallback seller data if we can't find the profile
    const sellerInfo = sellerData || {
      id: data.seller_id,
      username: "Unknown User",
      rank: "Newbie" as UserRank,
      avatar_url: null
    };
    
    // Convert seller data to User type
    const seller = adaptSellerToUserType(sellerInfo);


    return {
      id: data.id,
      collectionItemId: data.collection_item_id,
      collectionItem: collectionItem,
      sellerId: data.seller_id,
      seller,
      status: data.status,
      external_listing_url: data.external_listing_url,
      is_url_approved: data.is_url_approved,
      listing_type: (data.listing_type ?? 'sale') as ListingType,
      currency: (data.currency ?? 'USD') as ListingCurrency,
      reference_code: data.reference_code,
      published_at: data.published_at,
      archived_at: data.archived_at,
      pending_url_domain: data.pending_url_domain,
      public_remark: data.public_remark,
      is_sold: data.is_sold ?? false,
      sold_at: data.sold_at,
      auction_at: data.auction_at,
      auction_timezone: data.auction_timezone,
      lot_number: data.lot_number,
      start_price: data.start_price,
      estimated_price: data.estimated_price,
      realized_price: data.realized_price,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as MarketplaceItem;
  } catch (error) {
    console.error("Error in getMarketplaceItemById:", error);
    return null;
  }
}

export async function getMarketplaceItemForCollectionItem(
  collectionItemId: string
): Promise<MarketplaceItem | null> {
  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('*')
      .eq('collection_item_id', collectionItemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw error;
    }

    if (!data) return null;
    
    // Get collection item details
    const collectionItem = await fetchCollectionItem(collectionItemId);
    if (!collectionItem) {
      console.log(`Collection item not found: ${collectionItemId}`);
      return null;
    }
    
    // Get seller info
    const { data: sellerData, error: sellerError } = await supabase
      .from('profiles')
      .select('id, username, rank, avatar_url, selected_language')
      .eq('id', data.seller_id)
      .single();
      
    if (sellerError) {
      console.log(`Error fetching seller data: ${sellerError.message}`);
    }
    
    const sellerInfo = sellerData || {
      id: data.seller_id,
      username: "Unknown User",
      rank: "Newbie" as UserRank,
      avatar_url: null
    };
    
    // Convert seller data to User type
    const seller = adaptSellerToUserType(sellerInfo);
    
    return {
      id: data.id,
      collectionItemId: data.collection_item_id,
      collectionItem: collectionItem,
      sellerId: data.seller_id,
      seller,
      status: data.status,
      external_listing_url: data.external_listing_url,
      is_url_approved: data.is_url_approved,
      listing_type: (data.listing_type ?? 'sale') as ListingType,
      currency: (data.currency ?? 'USD') as ListingCurrency,
      reference_code: data.reference_code,
      published_at: data.published_at,
      archived_at: data.archived_at,
      pending_url_domain: data.pending_url_domain,
      public_remark: data.public_remark,
      is_sold: data.is_sold ?? false,
      sold_at: data.sold_at,
      auction_at: data.auction_at,
      auction_timezone: data.auction_timezone,
      lot_number: data.lot_number,
      start_price: data.start_price,
      estimated_price: data.estimated_price,
      realized_price: data.realized_price,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as MarketplaceItem;
  } catch (error) {
    console.error("Error in getMarketplaceItemForCollectionItem:", error);
    return null;
  }
}

export async function synchronizeMarketplaceWithCollection() {
  try {
    
    // 1. Get all collection items marked for sale
    const { data: forSaleItems, error: collectionError } = await supabase
      .from('collection_items')
      .select('id, user_id, banknote_id')
      .eq('is_for_sale', true);
      
    if (collectionError) {
      console.error("Error fetching for-sale collection items:", collectionError);
      throw collectionError;
    }
    
    
    // 2. Get all marketplace items
    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from('marketplace_items')
      .select('id, collection_item_id, status')
      .in('status', ['Available', 'Reserved']);
      
    if (marketplaceError) {
      console.error("Error fetching marketplace items:", marketplaceError);
      throw marketplaceError;
    }
    
    // Create maps for easier lookups
    const marketplaceMap = new Map(
      (marketplaceItems || []).map(item => [item.collection_item_id, item])
    );
    
    // 3. Add missing items to marketplace
    let addedCount = 0;
    for (const item of forSaleItems || []) {
      if (!marketplaceMap.has(item.id)) {
        // This item is marked for sale but not in marketplace - add it
        const { error } = await supabase
          .from('marketplace_items')
          .insert({
            banknote_id: item.banknote_id,
            collection_item_id: item.id,
            seller_id: item.user_id,
            status: "Available"
          });
          
        if (error) {
          console.error(`Error adding item ${item.id} to marketplace:`, error);
          continue;
        }
        
        addedCount++;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error in synchronizeMarketplaceWithCollection:", error);
    return false;
  }
}

export async function fetchNewestMarketplaceItems(limit: number = 6): Promise<MarketplaceItem[]> {
  try {
    
    // Fetch marketplace items with status 'Available', ordered by created_at DESC (newest first)
    const { data: marketplaceItems, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        collection_items!inner (
          *,
          public_note_ar,
          public_note_tr,
          public_note_en,
          public_note_original_language,
          location_ar,
          location_tr,
          location_en,
          type_ar,
          type_en,
          type_tr,
          enhanced_banknotes_with_translations:banknote_id (*),
          unlisted_banknotes:unlisted_banknotes_id (*)
        )
      `)
      .eq('status', 'Available')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) {
      console.error("Error fetching newest marketplace items:", error);
      throw error;
    }
    
    
    if (!marketplaceItems || marketplaceItems.length === 0) {
      console.log("No newest marketplace items found");
      return [];
    }
    
    // Process the marketplace items using the same logic as fetchMarketplaceItems
    const enrichedItems = await Promise.all(
      marketplaceItems.map(async (item) => {
        try {
          
          const collectionItem = item.collection_items;
          if (!collectionItem) {
            console.log(`Collection item not found: ${item.collection_item_id}`);
            return null;
          }
          
          // Verify that the collection item is actually for sale
          if (!collectionItem.is_for_sale) {
            console.log(`Collection item ${item.collection_item_id} is no longer marked for sale, skipping`);
            return null;
          }

          // Get banknote data based on whether it's an unlisted banknote or not
          let banknote;
          if (collectionItem.is_unlisted_banknote && collectionItem.unlisted_banknotes) {
            banknote = normalizeBanknoteData(collectionItem.unlisted_banknotes, "unlisted");
          } else if (!collectionItem.is_unlisted_banknote && collectionItem.enhanced_banknotes_with_translations) {
            banknote = normalizeBanknoteData(mapBanknoteFromDatabase(collectionItem.enhanced_banknotes_with_translations), "detailed");
          }

          if (!banknote) {
            console.log(`No banknote data found for collection item ${item.collection_item_id}`);
            return null;
          }
          
          // Get basic seller info
          const { data: sellerData, error: sellerError } = await supabase
            .from('profiles')
            .select('id, username, rank, role, avatar_url, selected_language')
            .eq('id', item.seller_id)
            .single();
          
          if (sellerError) {
            console.log(`Error fetching seller data: ${sellerError.message}`);
          }
          
          // Fallback seller data if we can't find the profile
          const sellerInfo = sellerData || {
            id: item.seller_id,
            username: "Unknown User",
            rank: "Newbie" as UserRank,
            avatar_url: null
          };
          
          // Convert seller data to User type
          const seller = adaptSellerToUserType(sellerInfo);
          
          
          return {
            id: item.id,
            collectionItemId: item.collection_item_id,
            collectionItem: {
              id: collectionItem.id,
              userId: collectionItem.user_id,
              banknoteId: collectionItem.banknote_id,
              banknote,
              
              condition: collectionItem.condition as BanknoteCondition,
              grade_by: collectionItem.grade_by,
              grade: collectionItem.grade,
              grade_condition_description: collectionItem.grade_condition_description,
              salePrice: collectionItem.sale_price,
              isForSale: collectionItem.is_for_sale,
              publicNote: collectionItem.public_note,
              public_note_original_language: collectionItem.public_note_original_language,
              privateNote: collectionItem.private_note,
              purchasePrice: collectionItem.purchase_price,
              purchaseDate: collectionItem.purchase_date,
              location: collectionItem.location,
              obverseImage: collectionItem.obverse_image,
              reverseImage: collectionItem.reverse_image,
              orderIndex: collectionItem.order_index,
              createdAt: collectionItem.created_at,
              updatedAt: collectionItem.updated_at,
              is_unlisted_banknote: collectionItem.is_unlisted_banknote
            },
            sellerId: item.seller_id,
            seller,
            status: item.status,
            external_listing_url: item.external_listing_url,
            is_url_approved: item.is_url_approved,
            listing_type: (item.listing_type ?? 'sale') as ListingType,
            currency: (item.currency ?? 'USD') as ListingCurrency,
            reference_code: item.reference_code,
            published_at: item.published_at,
            archived_at: item.archived_at,
            pending_url_domain: item.pending_url_domain,
            public_remark: item.public_remark,
            is_sold: item.is_sold ?? false,
            sold_at: item.sold_at,
            auction_at: item.auction_at,
            auction_timezone: item.auction_timezone,
            lot_number: item.lot_number,
            start_price: item.start_price,
            estimated_price: item.estimated_price,
            realized_price: item.realized_price,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          } as MarketplaceItem;
        } catch (error) {
          console.error(`Error processing newest marketplace item ${item.id}:`, error);
          return null;
        }
      })
    );

    const validItems = enrichedItems.filter(item => item !== null) as MarketplaceItem[];
    return validItems.filter((i) => !isListingArchived(i));
  } catch (error) {
    console.error("Error in fetchNewestMarketplaceItems:", error);
    return [];
  }
}
