
// Update fetchBanknotes to use correct type mapping
export async function fetchBanknotes(filters?: BanknoteFilters): Promise<DetailedBanknote[]> {
  try {
    const query = supabase
      .from('detailed_banknotes')
      .select('*')
      .$filter(filters);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching banknotes:', error);
      return [];
    }

    return data.map(banknote => ({
      ...banknote,
      // Remove unsupported properties like faceValue
      gradeCounts: undefined,
      averagePrice: undefined
    }));
  } catch (error) {
    console.error('Unexpected error in fetchBanknotes:', error);
    return [];
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
      category: data.category
    };
    
    return banknote;
  } catch (error) {
    console.error('Unexpected error in fetchBanknoteDetail:', error);
    return null;
  }
}

// Add missing imports
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters } from '@/types';
