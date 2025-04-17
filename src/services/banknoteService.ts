
// Update fetchBanknotes to use correct type mapping
import { supabase } from "@/integrations/supabase/client";
import { DetailedBanknote, BanknoteFilters } from '@/types';

export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
    const query = supabase
      .from('detailed_banknotes')
      .select('*');
      
    // Apply filters if provided
    if (filters) {
      if (filters.country_id) {
        // Join with countries table to filter by country ID
        const { data: countryData } = await supabase
          .from('countries')
          .select('name')
          .eq('id', filters.country_id)
          .single();
          
        if (countryData?.name) {
          query.eq('country', countryData.name);
        }
      }
      
      if (filters.search) {
        query.or(`face_value.ilike.%${filters.search}%,extended_pick_number.ilike.%${filters.search}%,banknote_description.ilike.%${filters.search}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes:', error);
      return [];
    }

    return data.map(banknote => ({
      ...banknote,
      id: banknote.id,
      catalogId: banknote.extended_pick_number || '',
      country: banknote.country || '',
      denomination: banknote.face_value || '',
      year: banknote.gregorian_year || '',
      series: banknote.category || '',
      description: banknote.banknote_description || '',
      obverseDescription: '',
      reverseDescription: '',
      imageUrls: [
        banknote.front_picture || '',
        banknote.back_picture || ''
      ].filter(Boolean),
      isApproved: banknote.is_approved || false,
      isPending: banknote.is_pending || false,
      createdAt: banknote.created_at || '',
      updatedAt: banknote.updated_at || '',
      pickNumber: banknote.pick_number,
      turkCatalogNumber: banknote.turk_catalog_number,
      sultanName: banknote.sultan_name,
      sealNames: banknote.seal_names,
      rarity: banknote.rarity,
      printer: banknote.printer,
      type: banknote.type,
      category: banknote.category,
      categoryId: '', // Will be populated later when needed
      typeId: '', // Will be populated later when needed
      colors: banknote.colors ? [banknote.colors] : [], // Convert string to array to match type
      securityFeatures: [],
      gradeCounts: {},
      averagePrice: 0,
      islamicYear: banknote.islamic_year || '',
      gregorianYear: banknote.gregorian_year || '',
      banknoteDescription: banknote.banknote_description || '',
      historicalDescription: banknote.historical_description || '',
      serialNumbering: banknote.serial_numbering || '',
      securityElement: banknote.security_element || '',
      signaturesFront: banknote.signatures_front || '',
      signaturesBack: banknote.signatures_back || '',
      signatures: []
    }));
  } catch (error) {
    console.error('Unexpected error in fetchBanknotes:', error);
    return [];
  }
}

// Fix fetchBanknoteById function
export async function fetchBanknoteById(id: string): Promise<DetailedBanknote | null> {
  try {
    if (!id) {
      console.warn('No banknote ID provided to fetchBanknoteById');
      return null;
    }
    
    console.log(`Fetching banknote with ID: ${id}`);
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching banknote by ID:', error);
      return null;
    }
    
    if (!data) {
      console.log(`No banknote found with ID: ${id}`);
      return null;
    }
    
    // Convert database fields to client-side model
    const banknote: DetailedBanknote = {
      id: data.id,
      catalogId: data.extended_pick_number || '',
      country: data.country || '',
      denomination: data.face_value || '',
      year: data.gregorian_year || '',
      series: data.category || '',
      description: data.banknote_description || '',
      obverseDescription: '',
      reverseDescription: '',
      imageUrls: [
        data.front_picture || '',
        data.back_picture || ''
      ].filter(Boolean),
      isApproved: data.is_approved || false,
      isPending: data.is_pending || false,
      createdAt: data.created_at || '',
      updatedAt: data.updated_at || '',
      pickNumber: data.pick_number,
      turkCatalogNumber: data.turk_catalog_number,
      sultanName: data.sultan_name,
      sealNames: data.seal_names,
      rarity: data.rarity,
      printer: data.printer,
      type: data.type,
      category: data.category,
      categoryId: '', // Will be populated when needed
      typeId: '', // Will be populated when needed
      colors: data.colors ? [data.colors] : [], // Convert string to array to match type
      securityFeatures: [],
      gradeCounts: {},
      averagePrice: 0,
      islamicYear: data.islamic_year || '',
      gregorianYear: data.gregorian_year || '',
      banknoteDescription: data.banknote_description || '',
      historicalDescription: data.historical_description || '',
      serialNumbering: data.serial_numbering || '',
      securityElement: data.security_element || '',
      signaturesFront: data.signatures_front || '',
      signaturesBack: data.signatures_back || '',
      signatures: []
    };
    
    return banknote;
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteById:', error);
    return null;
  }
}

// Add the missing fetchBanknoteDetail function
export async function fetchBanknoteDetail(id: string): Promise<DetailedBanknote | null> {
  return fetchBanknoteById(id);
}

// Fix fetchBanknotesByCountryId function to correctly use country name from countries table
export async function fetchBanknotesByCountryId(countryId: string): Promise<DetailedBanknote[]> {
  try {
    if (!countryId) {
      console.error('No country ID provided to fetchBanknotesByCountryId');
      return [];
    }
    
    console.log(`Fetching banknotes for country ID: ${countryId}`);

    // First, get the country name from the countries table
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
    
    if (countryError || !countryData) {
      console.error('Error fetching country name:', countryError);
      return [];
    }

    console.log(`Found country name: ${countryData.name} for ID: ${countryId}`);
    
    // Then, use the country name to fetch banknotes
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('country', countryData.name);
    
    if (error) {
      console.error('Error fetching banknotes by country name:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} banknotes for country name: ${countryData.name}`);
    
    if (!data || data.length === 0) {
      console.warn(`No banknotes found for country name: ${countryData.name}`);
      return [];
    }
    
    // Convert database fields to client-side model
    const banknotes = data.map(item => ({
      id: item.id,
      catalogId: item.extended_pick_number || '',
      country: item.country || '',
      denomination: item.face_value || '',
      year: item.gregorian_year || '',
      series: item.category || '',
      description: item.banknote_description || '',
      obverseDescription: '',
      reverseDescription: '',
      imageUrls: [
        item.front_picture || '',
        item.back_picture || ''
      ].filter(Boolean),
      isApproved: item.is_approved || false,
      isPending: item.is_pending || false,
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
      pickNumber: item.pick_number,
      turkCatalogNumber: item.turk_catalog_number,
      sultanName: item.sultan_name,
      sealNames: item.seal_names,
      rarity: item.rarity,
      printer: item.printer,
      type: item.type,
      category: item.category,
      categoryId: '', // Will be populated later when mapping to categories
      typeId: '', // Will be populated later when mapping to types
      colors: item.colors ? [item.colors] : [], // Convert string to array to match type
      securityFeatures: [],
      gradeCounts: {},
      averagePrice: 0,
      islamicYear: item.islamic_year || '',
      gregorianYear: item.gregorian_year || '',
      banknoteDescription: item.banknote_description || '',
      historicalDescription: item.historical_description || '',
      serialNumbering: item.serial_numbering || '',
      securityElement: item.security_element || '',
      signaturesFront: item.signatures_front || '',
      signaturesBack: item.signatures_back || '',
      signatures: []
    } as DetailedBanknote));
    
    return banknotes;
  } catch (error) {
    console.error('Unexpected error in fetchBanknotesByCountryId:', error);
    return [];
  }
}
