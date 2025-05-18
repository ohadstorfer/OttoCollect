import { supabase } from "@/integrations/supabase/client";
import type { CollectionItem, BanknoteCondition, UnlistedBanknote } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { fetchBanknoteById } from "@/services/banknoteService";
import { fetchCountryById } from "@/services/countryService";

// Utility to fetch a single unlisted banknote by id
export async function fetchUnlistedBanknoteById(unlistedBanknoteId: string): Promise<UnlistedBanknote | null> {
  try {
    const { data, error } = await supabase
      .from("unlisted_banknotes")
      .select("*")
      .eq("id", unlistedBanknoteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      isApproved: data.is_approved,
      isPending: data.is_pending,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      country: data.country,
      extendedPickNumber: data.extended_pick_number,
      pickNumber: data.pick_number,
      turkCatalogNumber: data.turk_catalog_number,
      faceValue: data.face_value,
      islamicYear: data.islamic_year,
      gregorianYear: data.gregorian_year,
      signaturesFront: data.signatures_front,
      signaturesBack: data.signatures_back,
      signaturePictures: data.signature_pictures,
      sealNames: data.seal_names,
      sealPictures: data.seal_pictures,
      watermarkPicture: data.watermark_picture,
      otherElementPictures: data.other_element_pictures,
      frontPicture: data.front_picture,
      backPicture: data.back_picture,
      sultanName: data.sultan_name,
      tughraPicture: data.tughra_picture,
      printer: data.printer,
      type: data.type,
      category: data.category,
      rarity: data.rarity,
      securityElement: data.security_element,
      colors: data.colors,
      serialNumbering: data.serial_numbering,
      banknoteDescription: data.banknote_description,
      historicalDescription: data.historical_description,
    } as UnlistedBanknote;
  } catch (err) {
    console.error("fetchUnlistedBanknoteById error", err);
    return null;
  }
}

// Update fetchUserCollection to support fetching related unlisted banknotes
export async function fetchUserCollection(userId: string): Promise<CollectionItem[]> {
  try {
    const { data: collectionItems, error } = await supabase
      .from('collection_items')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    // Fetch details for all collection items (regular OR unlisted)
    const enrichedItems = await Promise.all(
      (collectionItems || []).map(async (item) => {
        // If unlisted_banknotes_id present, fetch unlistedBanknote, else fetch banknote
        if (item.unlisted_banknotes_id) {
          const unlistedBanknote = await fetchUnlistedBanknoteById(item.unlisted_banknotes_id);
          return {
            id: item.id,
            userId: item.user_id,
            unlistedBanknotesId: item.unlisted_banknotes_id,
            unlistedBanknote,
            banknoteId: null,
            banknote: undefined,
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
            updatedAt: item.updated_at,
            isUnlistedBanknote: true
          } as CollectionItem;
        } else if (item.banknote_id) {
          const banknote = await fetchBanknoteById(item.banknote_id);
          if (!banknote) return null;
          if (!banknote.type) banknote.type = "Issued note"; // default
          return {
            id: item.id,
            userId: item.user_id,
            banknoteId: item.banknote_id,
            banknote,
            unlistedBanknotesId: null,
            unlistedBanknote: undefined,
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
            updatedAt: item.updated_at,
            isUnlistedBanknote: false
          } as CollectionItem;
        } else {
          return null;
        }
      })
    );
    return (enrichedItems.filter(Boolean) as CollectionItem[]);
  } catch (error) {
    console.error("[fetchUserCollection] Error in fetchUserCollection:", error);
    return [];
  }
}

// Add a function to create an unlisted banknote and a collection item that references it
export async function addUnlistedBanknoteAndToCollection(
  params: {
    userId: string;
    unlistedBanknote: Omit<UnlistedBanknote, "id" | "userId" | "createdAt" | "updatedAt">;
    collectionParams?: Omit<Partial<CollectionItem>, 'id' | 'banknoteId' | 'banknote' | 'unlistedBanknotesId' | 'unlistedBanknote' | 'userId'>;
  }
): Promise<CollectionItem | null> {
  try {
    // 1. Create new unlisted_banknotes row
    const { data: inserted, error } = await supabase
      .from("unlisted_banknotes")
      .insert({
        user_id: params.userId,
        ...params.unlistedBanknote
      })
      .select("*")
      .single();
    if (error || !inserted) throw error;

    // 2. Create new collection_items row, referencing the unlisted banknote
    const { data: insertedColl, error: errorColl } = await supabase
      .from("collection_items")
      .insert({
        user_id: params.userId,
        unlisted_banknotes_id: inserted.id,
        is_unlisted_banknote: true,
        ...(params?.collectionParams || {}),
      })
      .select("*")
      .single();

    if (errorColl || !insertedColl) throw errorColl;

    // 3. Fetch and return full enriched collection item (with unlisted data)
    const unlisted = await fetchUnlistedBanknoteById(inserted.id);
    return {
      id: insertedColl.id,
      userId: insertedColl.user_id,
      unlistedBanknotesId: insertedColl.unlisted_banknotes_id,
      unlistedBanknote: unlisted!,
      condition: insertedColl.condition as BanknoteCondition,
      salePrice: insertedColl.sale_price,
      isForSale: insertedColl.is_for_sale,
      publicNote: insertedColl.public_note,
      privateNote: insertedColl.private_note,
      purchasePrice: insertedColl.purchase_price,
      purchaseDate: insertedColl.purchase_date,
      location: insertedColl.location,
      obverseImage: insertedColl.obverse_image,
      reverseImage: insertedColl.reverse_image,
      orderIndex: insertedColl.order_index,
      createdAt: insertedColl.created_at,
      updatedAt: insertedColl.updated_at,
      isUnlistedBanknote: true
    } as CollectionItem;
  } catch (error) {
    console.error("Error in addUnlistedBanknoteAndToCollection", error);
    return null;
  }
}

// ---- Temporary placeholder: Upload collection image ----
export async function uploadCollectionImage(file: File): Promise<string> {
  // This is a placeholder! Implement file upload as needed.
  // For now, just return a dummy url.
  return URL.createObjectURL(file);
}

// ---- AddToCollection ----
export async function addToCollection(params: { userId: string, banknoteId: string }): Promise<CollectionItem | null> {
  try {
    const { data: inserted, error } = await supabase
      .from("collection_items")
      .insert({
        user_id: params.userId,
        banknote_id: params.banknoteId,
        is_unlisted_banknote: false,
      })
      .select("*")
      .single();
    if (error || !inserted) throw error;
    // Fetch actual details
    const banknote = await fetchBanknoteById(params.banknoteId);
    return {
      id: inserted.id,
      userId: inserted.user_id,
      banknoteId: params.banknoteId,
      banknote,
      unlistedBanknotesId: null,
      unlistedBanknote: undefined,
      condition: inserted.condition,
      salePrice: inserted.sale_price,
      isForSale: inserted.is_for_sale,
      publicNote: inserted.public_note,
      privateNote: inserted.private_note,
      purchasePrice: inserted.purchase_price,
      purchaseDate: inserted.purchase_date,
      location: inserted.location,
      obverseImage: inserted.obverse_image,
      reverseImage: inserted.reverse_image,
      orderIndex: inserted.order_index,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
      isUnlistedBanknote: false
    } as CollectionItem;
  } catch (error) {
    console.error("Error in addToCollection", error);
    return null;
  }
}

// ---- Remove From Collection ----
export async function removeFromCollection(id: string): Promise<boolean> {
  const { error } = await supabase.from("collection_items").delete().eq("id", id);
  return !error;
}

// ---- Update Collection Item (placeholder) ----
export async function updateCollectionItem(item: CollectionItem): Promise<CollectionItem | null> {
  // Minimal implementation for type safety - NOT full business logic!
  const { id, ...updates } = item;
  const { data, error } = await supabase
    .from("collection_items")
    .update({ ...updates })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) return null;
  return { ...item, ...data };
}

// ---- Fetch collection item by id ----
export async function fetchCollectionItem(id: string): Promise<CollectionItem | null> {
  const { data: item, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !item) return null;
  if (item.unlisted_banknotes_id) {
    const unlistedBanknote = await fetchUnlistedBanknoteById(item.unlisted_banknotes_id);
    return {
      id: item.id,
      userId: item.user_id,
      unlistedBanknotesId: item.unlisted_banknotes_id,
      unlistedBanknote,
      banknoteId: null,
      banknote: undefined,
      condition: item.condition,
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
      updatedAt: item.updated_at,
      isUnlistedBanknote: true
    } as CollectionItem;
  } else if (item.banknote_id) {
    const banknote = await fetchBanknoteById(item.banknote_id);
    return {
      id: item.id,
      userId: item.user_id,
      banknoteId: item.banknote_id,
      banknote,
      unlistedBanknotesId: null,
      unlistedBanknote: undefined,
      condition: item.condition,
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
      updatedAt: item.updated_at,
      isUnlistedBanknote: false
    } as CollectionItem;
  }
  return null;
}

// ---- For compatibility with uses in other files ----
// export async function fetchUserCollectionByCountry(userId: string, countryId: string) { ... }

// ---- For compatibility ----
export async function fetchUserCollectionItems(userId: string) {
  return fetchUserCollection(userId);
}

// Dummy placeholder for category/type extract
export async function fetchBanknoteCategoriesAndTypes(items: CollectionItem[]) {
  // Return dummy category/type groupings for now
  return { categories: [], types: [] };
}

// Dummy placeholder for count by country
export async function fetchUserCollectionCountByCountry(userId: string): Promise<number> {
  const { count } = await supabase
    .from("collection_items")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count || 0;
}
