
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters, UserRank } from '@/types';

export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
    console.log("Fetching banknotes with filters:", filters);
    let query = supabase
      .from('enhanced_banknotes_with_translations')
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

    console.log("Raw banknotes data from enhanced view:", data);
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
      console.error('[fetchBanknotesByCountryId] No country ID provided');
      return [];
    }
    
    // Get country name and filter data in parallel
    const [countryResult, categoryData, typeData] = await Promise.all([
      supabase.from('countries').select('name').eq('id', countryId).single(),
      filters?.categories?.length ? 
        supabase.from('banknote_category_definitions').select('name').in('id', filters.categories) : 
        Promise.resolve({ data: [] }),
      filters?.types?.length ? 
        supabase.from('banknote_type_definitions').select('name').in('id', filters.types) : 
        Promise.resolve({ data: [] })
    ]);
    
    if (countryResult.error || !countryResult.data) {
      console.error('[fetchBanknotesByCountryId] Error fetching country:', countryResult.error);
      return [];
    }
    
    const countryName = countryResult.data.name;
    const categoryNames = categoryData.data?.map(cat => cat.name) || [];
    const typeNames = typeData.data?.map(type => type.name) || [];
    
    // Build the main query
    let query = supabase
      .from('enhanced_banknotes_with_translations')
      .select('*')
      .eq('country', countryName);
    
    // Apply search filter if provided
    if (filters?.search?.trim()) {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(
        `extended_pick_number.ilike.%${searchTerm}%,` +
        `face_value.ilike.%${searchTerm}%,` + 
        `banknote_description.ilike.%${searchTerm}%,` +
        `sultan_name.ilike.%${searchTerm}%`
      );
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('[fetchBanknotesByCountryId] Error fetching banknotes:', error);
      return [];
    }

    // Apply filters efficiently
    let filteredData = data || [];
    
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
    
    if (typeNames.length > 0) {
      const lowerCaseTypes = typeNames.map(type => type.toLowerCase());
      filteredData = filteredData.filter(banknote => {
        const itemType = (banknote.type || "").toLowerCase();
        return lowerCaseTypes.some(typeName => {
          const normalizedTypeName = typeName.toLowerCase();
          if (itemType === normalizedTypeName) return true;
          if ((normalizedTypeName === "issued notes" && itemType === "issued note") ||
              (normalizedTypeName === "issued note" && itemType === "issued notes")) {
            return true;
          }
          return itemType.includes(normalizedTypeName) || normalizedTypeName.includes(itemType);
        });
      });
    }

    // Map database fields to client-side model
    return filteredData.map(mapBanknoteFromDatabase);
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
      .from('enhanced_banknotes_with_translations')
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
    
    console.log(`Fetched banknote with resolved URLs:`, {
      id: data.id,
      signatures_front_urls: data.signatures_front_urls,
      signatures_back_urls: data.signatures_back_urls,
      seal_picture_urls: data.seal_picture_urls,
      watermark_picture_url: data.watermark_picture_url,
      dimensions: data.dimensions
    });
    
    return mapBanknoteFromDatabase(data);
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteById:', error);
    return null;
  }
}

export async function fetchBanknoteDetail(id: string): Promise<DetailedBanknote | null> {
  try {
    const { data, error } = await supabase
      .from('enhanced_banknotes_with_translations')
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
    
    console.log(`Fetched banknote detail with resolved URLs:`, {
      id: data.id,
      signatures_front_urls: data.signatures_front_urls,
      signatures_back_urls: data.signatures_back_urls,
      seal_picture_urls: data.seal_picture_urls,
      watermark_picture_url: data.watermark_picture_url,
      dimensions: data.dimensions
    });
    
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
      .from('enhanced_banknotes_with_translations')
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
  // Destructure all fields at once for better performance
  const {
    id,
    extended_pick_number,
    country,
    face_value,
    gregorian_year,
    category,
    banknote_description,
    front_picture,
    back_picture,
    is_approved,
    is_pending,
    created_at,
    updated_at,
    pick_number,
    turk_catalog_number,
    sultan_name,
    seal_names,
    rarity,
    printer,
    type,
    islamic_year,
    historical_description,
    serial_numbering,
    security_element,
    signatures_front,
    signatures_back,
    colors,
    watermark_picture,
    dimensions,
    signatures_front_urls,
    signatures_back_urls,
    seal_picture_urls,
    watermark_picture_url,
    tughra_picture_url,
    other_element_pictures,
    authority_name,
    front_picture_watermarked,
    back_picture_watermarked,
    front_picture_thumbnail,
    back_picture_thumbnail
  } = item;

  // Create the mapped object using spread and computed properties
  const mapped: DetailedBanknote = {
    // Basic fields with fallbacks
    id,
    catalogId: extended_pick_number || '',
    extendedPickNumber: extended_pick_number || '',
    country: country || '',
    denomination: face_value || '',
    year: gregorian_year || '',
    series: category || '', // Use category as series
    description: banknote_description || '',
    obverseDescription: '',
    reverseDescription: '',
    
    // Image URLs array with filtering
    imageUrls: [front_picture, back_picture].filter(Boolean),
    
    // Boolean fields with fallbacks
    isApproved: is_approved || false,
    isPending: is_pending || false,
    
    // Date fields
    createdAt: created_at || '',
    updatedAt: updated_at || '',
    
    // Optional fields (no fallbacks needed)
    pickNumber: pick_number,
    turkCatalogNumber: turk_catalog_number,
    sultanName: sultan_name,
    sealNames: seal_names,
    rarity,
    printer,
    type,
    category,
    islamicYear: islamic_year,
    gregorianYear: gregorian_year,
    banknoteDescription: banknote_description,
    historicalDescription: historical_description,
    serialNumbering: serial_numbering,
    securityElement: security_element,
    dimensions: dimensions,
    
    // Signature fields with array handling
    signaturesFront: Array.isArray(signatures_front) ? signatures_front.join(', ') : (signatures_front || ''),
    signaturesBack: Array.isArray(signatures_back) ? signatures_back.join(', ') : (signatures_back || ''),
    
    // Other fields
    colors,
    watermark: watermark_picture,
    
    // Resolved URL fields with fallbacks
    signaturesFrontUrls: signatures_front_urls || [],
    signaturesBackUrls: signatures_back_urls || [],
    sealPictureUrls: seal_picture_urls || [],
    watermarkUrl: watermark_picture_url || null,
    tughraUrl: tughra_picture_url || null,
    otherElementPictures: other_element_pictures || [],
    // Legacy compatibility - combine front and back signature URLs
    signaturePictureUrls: [
      ...(signatures_front_urls || []),
      ...(signatures_back_urls || [])
    ],
    
    // Authority name
    authorityName: authority_name || null,
    
    // Watermarked and thumbnail images
    frontPictureWatermarked: front_picture_watermarked || null,
    backPictureWatermarked: back_picture_watermarked || null,
    frontPictureThumbnail: front_picture_thumbnail || null,
    backPictureThumbnail: back_picture_thumbnail || null
  };

  return mapped;
}

export interface BanknoteCollectorProfile {
  id: string;
  username: string;
  avatar_url?: string;
  rank?: UserRank;
  role?: string;
  created_at: string;
}

export interface BanknoteCollectorsResponse {
  collectors: BanknoteCollectorProfile[];
  total_count: number;
}

export async function getBanknoteCollectors(banknoteId: string): Promise<BanknoteCollectorsResponse> {
  try {
    // Get user IDs from collection_items for this banknote
    const { data: collectionData, error: collectionError } = await supabase
      .from('collection_items')
      .select('user_id')
      .eq('banknote_id', banknoteId);

    if (collectionError) throw collectionError;

    if (!collectionData || collectionData.length === 0) {
      return {
        collectors: [],
        total_count: 0
      };
    }

    // Get unique user IDs (in case a user has multiple copies of the same banknote)
    const userIds = [...new Set(collectionData.map(item => item.user_id))];

    // Fetch profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, rank, role, created_at')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    return {
      collectors: profilesData || [],
      total_count: userIds.length // Count of unique users, not collection items
    };
  } catch (error) {
    console.error('Error fetching banknote collectors:', error);
    return {
      collectors: [],
      total_count: 0
    };
  }
}
