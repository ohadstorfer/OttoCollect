
import { supabase } from '@/integrations/supabase/client';
import { Banknote, DetailedBanknote } from '@/types';
import { fetchCategoriesByCountryId, fetchTypesByCountryId } from '@/services/countryService';

export async function fetchBanknotes(): Promise<Banknote[]> {
  try {
    console.log("Fetching banknotes from Supabase");
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('is_pending', false);

    if (error) {
      console.error("Error fetching banknotes:", error);
      throw error;
    }

    console.log(`Fetched ${data.length} banknotes from Supabase`);
    return data.map(transformToDetailedBanknote);
  } catch (error) {
    console.error('Error fetching banknotes:', error);
    return [];
  }
}

export async function fetchBanknotesByCountryId(countryId: string): Promise<Banknote[]> {
  try {
    // First get the country name
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
      
    if (countryError) {
      console.error("Error fetching country data:", countryError);
      throw countryError;
    }
    
    if (!countryData) {
      console.error(`Country with ID ${countryId} not found`);
      return [];
    }

    // Fetch banknotes by country name
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('country', countryData.name)
      .eq('is_pending', false);

    if (error) {
      console.error("Error fetching banknotes by country ID:", error);
      throw error;
    }

    // Get categories and types for this country
    const categories = await fetchCategoriesByCountryId(countryId);
    const types = await fetchTypesByCountryId(countryId);
    
    // Map category and type names to IDs
    const categoryMap = new Map(categories.map(cat => [cat.name, cat.id]));
    const typeMap = new Map(types.map(type => [normalizeType(type.name), type.id]));
    
    // Enhance banknotes with category and type IDs
    const enhancedBanknotes = data.map(banknote => {
      const transformed = transformToDetailedBanknote(banknote);
      return {
        ...transformed,
        categoryId: transformed.series ? categoryMap.get(transformed.series) : undefined,
        typeId: transformed.type ? typeMap.get(normalizeType(transformed.type)) : typeMap.get('issued notes')
      };
    });
    
    return enhancedBanknotes;
  } catch (error) {
    console.error(`Error fetching banknotes for country ${countryId}:`, error);
    return [];
  }
}

// Helper function to normalize types
function normalizeType(type: string | undefined): string {
  if (!type) return "issued notes";
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes("issued") || lowerType === "issue") return "issued notes";
  if (lowerType.includes("specimen")) return "specimens";
  if (lowerType.includes("cancelled") || lowerType.includes("annule")) return "cancelled & annule";
  if (lowerType.includes("trial")) return "trial note";
  if (lowerType.includes("error")) return "error banknote";
  if (lowerType.includes("counterfeit")) return "counterfeit banknote";
  if (lowerType.includes("emergency")) return "emergency note";
  if (lowerType.includes("check") || lowerType.includes("bond")) return "check & bond notes";
  
  return lowerType;
}

export async function fetchBanknoteById(id: string): Promise<Banknote | null> {
  try {
    console.log("Fetching banknote by id:", id);
    const { data, error } = await supabase
      .from('detailed_banknotes')
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
    const { data, error } = await supabase
      .from('detailed_banknotes')
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
    const { data, error } = await supabase
      .from('detailed_banknotes')
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
    const { data, error } = await supabase
      .from('detailed_banknotes')
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
    rarity: detailed.rarity || '',
    categoryId: '',  // Will be populated later if needed
    typeId: '',      // Will be populated later if needed
    type: detailed.type || 'Issued note',
  };
}

// Helper function to transform database object to detailed banknote format
function transformToDetailedBanknote(data: any): DetailedBanknote {
  const banknote = transformDetailedToBanknote(data);
  
  return {
    ...banknote,
    extendedPickNumber: data.extended_pick_number,
    pickNumber: data.pick_number,
    turkCatalogNumber: data.turk_catalog_number,
    islamicYear: data.islamic_year,
    gregorianYear: data.gregorian_year,
    denomination: data.face_value, // Match with banknote property
    signaturesFront: data.signatures_front,
    signaturesBack: data.signatures_back,
    sealNames: data.seal_names,
    seal_pictures: data.seal_pictures,
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
    historicalDescription: data.historical_description,
    gradeCounts: {},
    averagePrice: null
  };
}

export const mapBanknoteFromSupabase = (rawData: any): DetailedBanknote => {
  const basicBanknote: Banknote = {
    id: rawData.id,
    country: rawData.country || '',
    denomination: rawData.face_value || '',
    year: rawData.gregorian_year || rawData.islamic_year || '',
    imageUrls: [
      rawData.front_picture, 
      rawData.back_picture
    ].filter(Boolean),
    isApproved: rawData.is_approved === true,
    isPending: rawData.is_pending === true,
    series: rawData.category || '',
    type: rawData.type || '',
    catalogId: rawData.pick_number || rawData.turk_catalog_number || '',
    description: rawData.banknote_description || '',
    createdAt: rawData.created_at || '',
    updatedAt: rawData.updated_at || '',
    categoryId: '',
    typeId: '',
  };
  
  return {
    ...basicBanknote,
    pickNumber: rawData.pick_number || '',
    extendedPickNumber: rawData.extended_pick_number || '',
    turkCatalogNumber: rawData.turk_catalog_number || '',
    faceValue: rawData.face_value || '',
    description: rawData.banknote_description || '',
    createdAt: rawData.created_at || '',
    updatedAt: rawData.updated_at || '',
    gregorianYear: rawData.gregorian_year || '',
    islamicYear: rawData.islamic_year || '',
    sultans: rawData.sultan_name ? [rawData.sultan_name] : [],
    sultanName: rawData.sultan_name || '',
    islandscapeLayout: false,
    rarity: rawData.rarity || '',
    historicalDescription: rawData.historical_description || '',
    frontDescription: rawData.banknote_description || '',
    backDescription: '',
    frontPicture: rawData.front_picture || '',
    backPicture: rawData.back_picture || '',
    serialNumbering: rawData.serial_numbering || '',
    sealNames: rawData.seal_names || '',
    signaturesFront: rawData.signatures_front || '',
    signaturesBack: rawData.signatures_back || '',
    colors: rawData.colors || '',
    watermarkPicture: rawData.watermark_picture || '',
    securityElement: rawData.security_element || '',
    printer: rawData.printer || '',
    category: rawData.category || '',
    type: rawData.type || '',
    tughraPicture: rawData.tughra_picture || '',
    seal_pictures: rawData.seal_pictures || [],
    signaturePictures: rawData.signature_pictures || [],
    otherElementPictures: rawData.other_element_pictures || [],
    gradeCounts: {},
    averagePrice: 0,
  };
};
