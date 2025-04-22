
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters } from '@/types';

export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
    console.log("Fetching banknotes with filters:", filters);
    let query = supabase
      .from('detailed_banknotes')
      .select('*');
    
    // Apply filters if provided
    if (filters?.country_id) {
      const { data: country } = await supabase
        .from('countries')
        .select('name')
        .eq('id', filters.country_id)
        .single();
        
      if (country?.name) {
        query = query.eq('country', country.name);
      }
    }
    
    if (filters?.search) {
      query = query.or(`extended_pick_number.ilike.%${filters.search}%,face_value.ilike.%${filters.search}%,banknote_description.ilike.%${filters.search}%`);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes:', error);
      return [];
    }

    return data.map(banknote => mapBanknoteFromDatabase(banknote));
  } catch (error) {
    console.error('Unexpected error in fetchBanknotes:', error);
    return [];
  }
}

export async function fetchBanknotesByCountryId(
  countryId: string, 
  filters?: { 
    search?: string;
    categories?: string[];
    types?: string[];
    sort?: string[];
  }
): Promise<DetailedBanknote[]> {
  try {
    if (!countryId) {
      console.error('No country ID provided to fetchBanknotesByCountryId');
      return [];
    }
    
    console.log(`Fetching banknotes for country ID: ${countryId} with filters:`, filters);
    
    // First, get the country name using the country ID
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
    
    if (countryError || !country) {
      console.error('Error fetching country name:', countryError);
      return [];
    }
    
    // Build the base query
    let query = supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('country', country.name);

    // Apply search filter if provided
    if (filters?.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(
        `extended_pick_number.ilike.%${searchTerm}%,` +
        `face_value.ilike.%${searchTerm}%,` + 
        `banknote_description.ilike.%${searchTerm}%,` +
        `sultan_name.ilike.%${searchTerm}%`
      );
    }

    // Apply category and type filters
    if (filters?.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }

    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types);
    }

    // Apply sorting based on the sort fields
    if (filters?.sort && filters.sort.length > 0) {
      for (const sortField of filters.sort) {
        switch (sortField) {
          case "extPick":
            query = query.order('extended_pick_number', { ascending: true });
            break;
          case "newest":
            query = query.order('created_at', { ascending: false });
            break;
          case "sultan":
            query = query.order('sultan_name', { ascending: true });
            break;
          case "faceValue":
            query = query.order('face_value', { ascending: true });
            break;
        }
      }
    } else {
      // Default sorting
      query = query.order('extended_pick_number', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes by country:', error);
      return [];
    }

    // Map database fields to client-side model
    return data.map(mapBanknoteFromDatabase);
  } catch (error) {
    console.error('Unexpected error in fetchBanknotesByCountryId:', error);
    return [];
  }
}

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
    
    return mapBanknoteFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteById:', error);
    return null;
  }
}

export async function fetchBanknoteDetail(id: string): Promise<DetailedBanknote | null> {
  try {
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching banknote detail:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return mapBanknoteFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteDetail:', error);
    return null;
  }
}

// Helper function to map database fields to client-side model
function mapBanknoteFromDatabase(item: any): DetailedBanknote {
  return {
    id: item.id,
    catalogId: item.extended_pick_number || '',
    extendedPickNumber: item.extended_pick_number || '', 
    country: item.country || '',
    denomination: item.face_value || '',
    year: item.gregorian_year || '',
    series: item.category || '', // Use category as series
    description: item.banknote_description || '',
    obverseDescription: '',
    reverseDescription: '',
    imageUrls: Array.isArray(item.front_picture) || Array.isArray(item.back_picture) ? 
      // Handle array cases
      [...(Array.isArray(item.front_picture) ? item.front_picture : [item.front_picture]), 
       ...(Array.isArray(item.back_picture) ? item.back_picture : [item.back_picture])]
        .filter(Boolean) :
      // Handle string cases
      [
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
    islamicYear: item.islamic_year,
    gregorianYear: item.gregorian_year,
    banknoteDescription: item.banknote_description,
    historicalDescription: item.historical_description,
    serialNumbering: item.serial_numbering,
    securityElement: item.security_element,
    signaturesFront: item.signatures_front,
    signaturesBack: item.signatures_back,
    colors: item.colors,
  } as DetailedBanknote;
}
