
import { supabase } from "@/integrations/supabase/client";
import { Banknote, DetailedBanknote } from "@/types";

export async function fetchBanknotes(): Promise<Banknote[]> {
  try {
    console.log("Fetching banknotes from Supabase");
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('is_pending', false);

    if (error) {
      console.error("Error fetching banknotes:", error);
      throw error;
    }

    console.log(`Fetched ${data.length} banknotes from Supabase`);
    return data.map(transformDetailedToBanknote);
  } catch (error) {
    console.error('Error fetching banknotes:', error);
    return [];
  }
}

export async function fetchBanknoteById(id: string): Promise<Banknote | null> {
  try {
    console.log("Fetching banknote by id:", id);
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching banknote by id:", error);
      throw error;
    }

    console.log("Fetched banknote:", data);
    return transformDetailedToBanknote(data);
  } catch (error) {
    console.error('Error fetching banknote by id:', error);
    return null;
  }
}

export async function fetchDetailedBanknote(id: string): Promise<DetailedBanknote | null> {
  try {
    console.log("Fetching detailed banknote:", id);
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching detailed banknote:", error);
      throw error;
    }

    console.log("Fetched detailed banknote:", data);
    return transformToDetailedBanknote(data);
  } catch (error) {
    console.error('Error fetching detailed banknote:', error);
    return null;
  }
}

export async function fetchBanknoteDetail(id: string): Promise<DetailedBanknote | null> {
  return fetchDetailedBanknote(id);
}

export async function fetchBanknotesByCategory(category: string): Promise<Banknote[]> {
  try {
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('is_approved', true)
      .eq('is_pending', false)
      .eq('category', category);

    if (error) throw error;

    return data.map(transformDetailedToBanknote);
  } catch (error) {
    console.error('Error fetching banknotes by category:', error);
    return [];
  }
}

export async function fetchBanknotesByPeriod(startYear: number, endYear: number): Promise<Banknote[]> {
  try {
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('is_approved', true)
      .eq('is_pending', false)
      .gte('gregorian_year', startYear.toString())
      .lte('gregorian_year', endYear.toString());

    if (error) throw error;

    return data.map(transformDetailedToBanknote);
  } catch (error) {
    console.error('Error fetching banknotes by period:', error);
    return [];
  }
}

// Helper function to transform a database object to the Banknote format
function transformDetailedToBanknote(detailed: any): Banknote {
  const imageUrls: string[] = [];
  
  if (detailed.front_picture) imageUrls.push(detailed.front_picture);
  if (detailed.back_picture) imageUrls.push(detailed.back_picture);
  if (detailed.seal_pictures && detailed.seal_pictures.length) imageUrls.push(...detailed.seal_pictures);
  if (detailed.tughra_picture) imageUrls.push(detailed.tughra_picture);
  if (detailed.watermark_picture) imageUrls.push(detailed.watermark_picture);
  if (detailed.other_element_pictures && detailed.other_element_pictures.length) imageUrls.push(...detailed.other_element_pictures);
  
  return {
    id: detailed.id,
    pick_number: detailed.pick_number || detailed.extended_pick_number || 'Unknown',
    catalogId: detailed.extended_pick_number || detailed.pick_number || 'Unknown',
    country: detailed.country || 'Unknown',
    denomination: detailed.face_value || 'Unknown',
    year: detailed.gregorian_year || detailed.islamic_year || 'Unknown',
    series: detailed.category,
    description: detailed.banknote_description || `${detailed.face_value || 'Unknown'} from ${detailed.gregorian_year || detailed.islamic_year || 'Unknown'}`,
    obverseDescription: detailed.banknote_description,
    reverseDescription: detailed.historical_description,
    imageUrls: imageUrls.length > 0 ? imageUrls : ['/placeholder.svg'],
    isApproved: detailed.is_approved !== false, // Default to true if not specified
    isPending: detailed.is_pending === true,    // Default to false if not specified
    createdAt: detailed.created_at || new Date().toISOString(),
    updatedAt: detailed.updated_at || new Date().toISOString(),
    createdBy: detailed.created_by || 'system',
    turkCatalogNumber: detailed.turk_catalog_number,
    sultanName: detailed.sultan_name,
    sealNames: detailed.seal_names,
    type: detailed.type,
    printer: detailed.printer,
    rarity: detailed.rarity
  };
}

// Helper function to transform database object to detailed banknote format
function transformToDetailedBanknote(data: any): DetailedBanknote {
  const imageUrls: string[] = [];
  
  if (data.front_picture) imageUrls.push(data.front_picture);
  if (data.back_picture) imageUrls.push(data.back_picture);
  if (data.seal_pictures && data.seal_pictures.length) imageUrls.push(...data.seal_pictures);
  if (data.tughra_picture) imageUrls.push(data.tughra_picture);
  if (data.watermark_picture) imageUrls.push(data.watermark_picture);
  if (data.other_element_pictures && data.other_element_pictures.length) imageUrls.push(...data.other_element_pictures);
  
  return {
    id: data.id,
    pick_number: data.pick_number || data.extended_pick_number || 'Unknown',
    catalogId: data.extended_pick_number || data.pick_number || 'Unknown',
    country: data.country || 'Unknown',
    denomination: data.face_value || 'Unknown',
    year: data.gregorian_year || data.islamic_year || 'Unknown',
    series: data.category,
    description: data.banknote_description || `${data.face_value || 'Unknown'} from ${data.gregorian_year || data.islamic_year || 'Unknown'}`,
    obverseDescription: data.banknote_description,
    reverseDescription: data.historical_description,
    imageUrls: imageUrls.length > 0 ? imageUrls : ['/placeholder.svg'],
    isApproved: data.is_approved !== false,
    isPending: data.is_pending === true,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
    createdBy: data.created_by || 'system',
    
    // Additional DetailedBanknote fields
    extendedPickNumber: data.extended_pick_number,
    pickNumber: data.pick_number,
    turkCatalogNumber: data.turk_catalog_number,
    islamicYear: data.islamic_year,
    gregorianYear: data.gregorian_year,
    faceValue: data.face_value,
    signaturesFront: data.signatures_front,
    signaturesBack: data.signatures_back,
    sealNames: data.seal_names,
    sealPictures: data.seal_pictures,
    signaturePictures: data.signature_pictures,
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
    historicalDescription: data.historical_description
  };
}
