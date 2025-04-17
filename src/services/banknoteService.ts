
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters } from '@/types';

// Update fetchBanknotes to use correct type mapping
export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
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
      query = query.ilike('extended_pick_number', `%${filters.search}%`);
    }
    
    if (filters?.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }
    
    if (filters?.types && filters.types.length > 0) {
      query = query.in('type', filters.types);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes:', error);
      return [];
    }

    return data.map(banknote => ({
      id: banknote.id,
      catalogId: banknote.extended_pick_number || '',
      country: banknote.country || '',
      denomination: banknote.face_value || '',
      year: banknote.gregorian_year || '',
      series: '',
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
      category: banknote.category
    }));
  } catch (error) {
    console.error('Unexpected error in fetchBanknotes:', error);
    return [];
  }
}

// Add the missing fetchBanknoteById function
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
      series: '',
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
      category: data.category
    };
    
    return banknote;
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteById:', error);
    return null;
  }
}

// Add the missing fetchBanknoteDetail function
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
    
    // Convert database fields to client-side model
    const banknote: DetailedBanknote = {
      id: data.id,
      catalogId: data.extended_pick_number || '',
      country: data.country || '',
      denomination: data.face_value || '',
      year: data.gregorian_year || '',
      series: '',
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
      // Add these fields as requested by the DetailedBanknote type
      securityFeatures: [],
      watermark: '',
      signatures: [],
      colors: [],
    };
    
    return banknote;
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteDetail:', error);
    return null;
  }
}

// Add the missing fetchBanknotesByCountryId function
export async function fetchBanknotesByCountryId(countryId: string): Promise<DetailedBanknote[]> {
  try {
    if (!countryId) {
      console.error('No country ID provided to fetchBanknotesByCountryId');
      return [];
    }
    
    console.log(`Fetching banknotes for country ID: ${countryId}`);
    
    const { data, error } = await supabase
      .from('detailed_banknotes')
      .select('*')
      .filter('country_id', 'eq', countryId);
    
    if (error) {
      console.error('Error fetching banknotes by country ID:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} banknotes for country ID: ${countryId}`);
    
    // Convert database fields to client-side model
    const banknotes = data?.map(item => ({
      id: item.id,
      catalogId: item.extended_pick_number || '',
      country: item.country || '',
      denomination: item.face_value || '',
      year: item.gregorian_year || '',
      series: '',
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
    } as DetailedBanknote)) || [];
    
    return banknotes;
  } catch (error) {
    console.error('Unexpected error in fetchBanknotesByCountryId:', error);
    return [];
  }
}

// Add missing imports
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters } from '@/types';
