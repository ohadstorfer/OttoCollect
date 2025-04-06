
import { supabase } from "@/integrations/supabase/client";
import { Banknote, DetailedBanknote } from "@/types";

export async function fetchBanknotes(): Promise<Banknote[]> {
  try {
    console.log("Fetching banknotes from Supabase");
    // Using type assertion to avoid the TypeScript error
    const { data, error } = await supabase
      .from('detailed_banknotes' as any)
      .select('*')
      .eq('is_approved', true)
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
    // Cast the data to DetailedBanknote type
    return data as unknown as DetailedBanknote;
  } catch (error) {
    console.error('Error fetching detailed banknote:', error);
    return null;
  }
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

// Helper function to transform a DetailedBanknote to the Banknote format
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
    catalogId: detailed.extended_pick_number || detailed.pick_number,
    country: detailed.country,
    denomination: detailed.face_value,
    year: detailed.gregorian_year || detailed.islamic_year || 'Unknown',
    series: detailed.category,
    description: detailed.banknote_description || `${detailed.face_value} from ${detailed.gregorian_year || detailed.islamic_year}`,
    obverseDescription: detailed.banknote_description,
    reverseDescription: detailed.historical_description,
    imageUrls: imageUrls.length > 0 ? imageUrls : ['/placeholder.svg'],
    isApproved: detailed.is_approved,
    isPending: detailed.is_pending,
    createdAt: detailed.created_at,
    updatedAt: detailed.updated_at,
    createdBy: 'system'
  };
}
