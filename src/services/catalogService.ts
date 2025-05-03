
import { DetailedBanknote } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export async function fetchBanknoteById(id: string): Promise<DetailedBanknote | null> {
  console.log(`fetchBanknoteById: Starting fetch for banknote ID ${id}`);
  
  try {
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching banknote with ID ${id}:`, error);
      return null;
    }

    console.log(`fetchBanknoteById: Raw data from database:`, data);

    // Transform the data to match DetailedBanknote interface with camelCase properties
    const banknote: DetailedBanknote = {
      id: data.id,
      catalogId: data.id, // Using same ID as catalogId for now
      country: data.country || 'Unknown Country',
      denomination: data.face_value || 'Unknown Denomination',
      year: data.gregorian_year || data.islamic_year || '',
      series: data.category || '',
      description: data.banknote_description || '',
      imageUrls: [], // Initialize as empty array - this will be populated below
      isApproved: data.is_approved || false,
      isPending: data.is_pending || false,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      pickNumber: data.pick_number || '',
      turkCatalogNumber: data.turk_catalog_number || '',
      sultanName: data.sultan_name || '',
      sealNames: data.seal_names || '',
      rarity: data.rarity || '',
      printer: data.printer || '',
      type: data.type || 'Issued note',
      category: data.category || '',
      securityFeatures: [],
      watermark: data.watermark_picture || '',
      signatures: [data.signatures_front, data.signatures_back].filter(Boolean) as string[],
      colors: data.colors || '',
      islamicYear: data.islamic_year || '',
      gregorianYear: data.gregorian_year || '',
      banknoteDescription: data.banknote_description || '',
      historicalDescription: data.historical_description || '',
      serialNumbering: data.serial_numbering || '',
      securityElement: data.security_element || '',
      signaturesFront: data.signatures_front || '',
      signaturesBack: data.signatures_back || '',
      extendedPickNumber: data.extended_pick_number || '',
    };

    // Handle images correctly as an array
    if (data.front_picture) {
      banknote.imageUrls.push(data.front_picture);
    }
    
    if (data.back_picture) {
      banknote.imageUrls.push(data.back_picture);
    }

    console.log(`fetchBanknoteById: Transformed banknote data:`, {
      id: banknote.id,
      catalogId: banknote.catalogId,
      country: banknote.country,
      denomination: banknote.denomination,
      year: banknote.year,
      imageUrls: banknote.imageUrls,
      imageUrlsType: Array.isArray(banknote.imageUrls) ? 'array' : 'string',
      type: banknote.type,
      category: banknote.category
    });

    return banknote;
  } catch (error) {
    console.error("Error in fetchBanknoteById:", error);
    return null;
  }
}
