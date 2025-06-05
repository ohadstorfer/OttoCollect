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
      console.error('[fetchBanknotesByCountryId] No country ID provided to fetchBanknotesByCountryId');
      return [];
    }
    
    console.log(`[fetchBanknotesByCountryId] Called with countryId:`, countryId, "filters:", filters);
    
    // First, get the country name using the country ID
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
    
    if (countryError || !country) {
      console.error('[fetchBanknotesByCountryId] Error fetching country name:', countryError, 'Result:', country);
      return [];
    }
    
    console.log(`[fetchBanknotesByCountryId] Found country name:`, country.name, 'for ID:', countryId);
    
    // Get category names from category IDs
    let categoryNames: string[] = [];
    if (filters?.categories && filters.categories.length > 0) {
      try {
        const { data: categoryData } = await supabase
          .from('banknote_category_definitions')
          .select('name')
          .in('id', filters.categories);
        
        if (categoryData && categoryData.length > 0) {
          categoryNames = categoryData.map(cat => cat.name);
          console.log('[fetchBanknotesByCountryId] Filtering by categories:', categoryNames);
        }
      } catch (err) {
        console.error('[fetchBanknotesByCountryId] Error fetching category names:', err);
      }
    }
    
    // Get type names from type IDs
    let typeNames: string[] = [];
    if (filters?.types && filters.types.length > 0) {
      try {
        const { data: typeData } = await supabase
          .from('banknote_type_definitions')
          .select('name')
          .in('id', filters.types);
        
        if (typeData && typeData.length > 0) {
          typeNames = typeData.map(type => type.name);
          console.log('[fetchBanknotesByCountryId] Filtering by types:', typeNames);
        }
      } catch (err) {
        console.error('[fetchBanknotesByCountryId] Error fetching type names:', err);
      }
    }
    
    // Build the query with the country filter - using the detailed_banknotes
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
    
    // Execute the query to get all banknotes for this country
    const { data, error } = await query;
    
    if (error) {
      console.error('[fetchBanknotesByCountryId] Error fetching banknotes by country:', error);
      return [];
    }

    console.log(`[fetchBanknotesByCountryId] Raw banknote data response for country "${country.name}":`, data);

    // Filter by category and type on the server side
    let filteredData = [...(data || [])];
    
    // Apply category filters if any
    if (categoryNames.length > 0) {
      const lowerCaseCategories = categoryNames.map(cat => cat.toLowerCase());
      
      filteredData = filteredData.filter(banknote => {
        const itemCategory = (banknote.category || "").toLowerCase();
        return lowerCaseCategories.some(categoryName => 
          itemCategory === categoryName.toLowerCase() ||
          itemCategory.includes(categoryName.toLowerCase()) ||
          categoryName.toLowerCase().includes(itemCategory)
        );
      });
    }
    
    // Apply type filters if any
    if (typeNames.length > 0) {
      const lowerCaseTypes = typeNames.map(type => type.toLowerCase());
      
      filteredData = filteredData.filter(banknote => {
        const itemType = (banknote.type || "").toLowerCase();
        return lowerCaseTypes.some(typeName => {
          const normalizedTypeName = typeName.toLowerCase();
          // Direct match
          if (itemType === normalizedTypeName) return true;
          
          // Special case for "Issued notes" which might be stored as "Issued note"
          if ((normalizedTypeName === "issued notes" && itemType === "issued note") ||
              (normalizedTypeName === "issued note" && itemType === "issued notes")) {
            return true;
          }
          
          // Partial match (more flexible)
          return itemType.includes(normalizedTypeName) || normalizedTypeName.includes(itemType);
        });
      });
    }
    
    console.log(`[fetchBanknotesByCountryId] Final filtered banknote count:`, filteredData.length);

    // Map database fields to client-side model
    const banknotes = filteredData.map(mapBanknoteFromDatabase);
    
    return banknotes;
  } catch (error) {
    console.error('[fetchBanknotesByCountryId] Unexpected error:', error);
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
    signaturesFront: item.signatures_front || '',
    signaturesBack: item.signatures_back || '',
    colors: item.colors,
    watermark: item.watermark_picture,
  } as DetailedBanknote;
}
