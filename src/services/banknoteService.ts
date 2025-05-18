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
  filterParams: { search?: string; categories?: string[]; types?: string[] }
): Promise<any[]> {
  // Use our new function for correct extended pick sorting
  const { data: rows, error } = await supabase.rpc('catalog_banknotes_sorted_by_country', {
    country_id: countryId
  });

  if (error) {
    console.error("[fetchBanknotesByCountryId] Error from SQL function:", error);
    return [];
  }
  if (!rows) return [];

  // Apply search, categories, types filters here (since we can't add them server-side easily)
  let filtered = [...rows];

  // Filter: search
  if (filterParams.search?.trim()) {
    const q = filterParams.search.toLowerCase();
    filtered = filtered.filter(banknote =>
      banknote.face_value?.toLowerCase().includes(q)
      || banknote.gregorian_year?.toLowerCase().includes(q)
      || banknote.extended_pick_number?.toLowerCase().includes(q)
      || banknote.type?.toLowerCase().includes(q)
      || banknote.category?.toLowerCase().includes(q)
      || banknote.sultan_name?.toLowerCase().includes(q)
    );
  }

  // Filter: categories/types (using names)
  if (filterParams.categories?.length) {
    filtered = filtered.filter(b => filterParams.categories!.includes(
      b.category // This matches by name
    ));
  }
  if (filterParams.types?.length) {
    filtered = filtered.filter(b => filterParams.types!.includes(
      b.type // This matches by name
    ));
  }

  // No further client-side sorting needed.
  return filtered.map(mapBanknoteFromDatabase);
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

export async function searchBanknotes(searchTerm: string): Promise<DetailedBanknote[]> {
  try {
    console.log("Searching banknotes with term:", searchTerm);
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .or(`extended_pick_number.ilike.%${searchTerm}%,face_value.ilike.%${searchTerm}%,banknote_description.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`)
      .limit(20);
    
    if (error) {
      console.error('Error searching banknotes:', error);
      return [];
    }

    return data.map(banknote => mapBanknoteFromDatabase(banknote));
  } catch (error) {
    console.error('Unexpected error in searchBanknotes:', error);
    return [];
  }
}

// Function to upload banknote images to Supabase storage
export const uploadBanknoteImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('banknote_images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('banknote_images')
      .getPublicUrl(data.path);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
};

// Helper function to map database fields to client-side model
export function mapBanknoteFromDatabase(item: any): DetailedBanknote {
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
