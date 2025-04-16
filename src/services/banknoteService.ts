
import { supabase } from "@/integrations/supabase/client";
import { Banknote, DetailedBanknote } from "@/types";
import { fetchCategoriesByCountryId, fetchTypesByCountryId } from "./countryService";

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
    rarity: detailed.rarity || '',  // Add rarity field to fix CountryDetail errors
    // Category and type IDs will be added by fetchBanknotesByCountryId when needed
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
    historicalDescription: data.historical_description,
    gradeCounts: {},  // This would need to be populated if needed
    averagePrice: null // This would need to be calculated if needed
  };
}
