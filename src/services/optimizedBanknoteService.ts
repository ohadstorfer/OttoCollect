import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote } from '@/types';
import { DynamicFilterState } from '@/types/filter';
import { mapBanknoteFromDatabase } from './banknoteService';

// Combined optimized query that fetches country data and banknotes in a single request
export async function fetchBanknotesWithMetadata(
  countryId: string, 
  filters?: DynamicFilterState
): Promise<{
  banknotes: DetailedBanknote[];
  countryName: string;
  totalCount: number;
}> {
  try {
    if (!countryId) {
      console.error('[fetchBanknotesWithMetadata] No country ID provided');
      return { banknotes: [], countryName: '', totalCount: 0 };
    }
    
    // Get country name first (this will be cached by React Query)
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('name')
      .eq('id', countryId)
      .single();
    
    if (countryError || !countryData) {
      console.error('[fetchBanknotesWithMetadata] Error fetching country:', countryError);
      return { banknotes: [], countryName: '', totalCount: 0 };
    }
    
    const countryName = countryData.name;
    
    // Build optimized query with server-side filtering
    let query = supabase
      .from('enhanced_banknotes_with_translations')
      .select('*', { count: 'exact' })
      .eq('country', countryName);
    
    // Apply search filter at database level
    if (filters?.search?.trim()) {
      const searchTerm = filters.search.toLowerCase();
      query = query.or(
        `extended_pick_number.ilike.%${searchTerm}%,` +
        `face_value.ilike.%${searchTerm}%,` + 
        `banknote_description.ilike.%${searchTerm}%,` +
        `sultan_name.ilike.%${searchTerm}%`
      );
    }
    
    // Apply category and type filters at database level if possible
    if (filters?.categories?.length) {
      // For now, we'll apply this client-side since we need to resolve category names
      // In a future optimization, we could create a database function to handle this
    }
    
    if (filters?.types?.length) {
      // Same as above - could be optimized with a database function
    }
    
    // Execute the query
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[fetchBanknotesWithMetadata] Error fetching banknotes:', error);
      return { banknotes: [], countryName, totalCount: 0 };
    }

    // Apply remaining filters efficiently on the client side
    let filteredData = data || [];
    
    // Apply category filter if provided
    if (filters?.categories?.length) {
      // Get category names in parallel with banknote query
      const { data: categoryData } = await supabase
        .from('banknote_category_definitions')
        .select('name')
        .in('id', filters.categories);
        
      if (categoryData?.length) {
        const categoryNames = categoryData.map(cat => cat.name.toLowerCase());
        filteredData = filteredData.filter(banknote => {
          const itemCategory = (banknote.category || "").toLowerCase();
          return categoryNames.some(categoryName => 
            itemCategory === categoryName ||
            itemCategory.includes(categoryName) ||
            categoryName.includes(itemCategory)
          );
        });
      }
    }
    
    // Apply type filter if provided
    if (filters?.types?.length) {
      const { data: typeData } = await supabase
        .from('banknote_type_definitions')
        .select('name')
        .in('id', filters.types);
        
      if (typeData?.length) {
        const typeNames = typeData.map(type => type.name.toLowerCase());
        filteredData = filteredData.filter(banknote => {
          const itemType = (banknote.type || "").toLowerCase();
          return typeNames.some(typeName => {
            if (itemType === typeName) return true;
            if ((typeName === "issued notes" && itemType === "issued note") ||
                (typeName === "issued note" && itemType === "issued notes")) {
              return true;
            }
            return itemType.includes(typeName) || typeName.includes(itemType);
          });
        });
      }
    }

    // Map to client model
    const mappedBanknotes = filteredData.map(mapBanknoteFromDatabase);
    
    return {
      banknotes: mappedBanknotes,
      countryName,
      totalCount: count || mappedBanknotes.length
    };
  } catch (error) {
    console.error('[fetchBanknotesWithMetadata] Unexpected error:', error);
    return { banknotes: [], countryName: '', totalCount: 0 };
  }
}

// Optimized function to fetch filter metadata (categories, types, sort options)
export async function fetchCountryFilterMetadata(countryId: string) {
  try {
    const [categoriesResult, typesResult, sortOptionsResult] = await Promise.all([
      supabase
        .from('banknote_category_definitions')
        .select('id, name, display_order, description')
        .eq('country_id', countryId)
        .order('display_order'),
      supabase
        .from('banknote_type_definitions')
        .select('id, name, display_order, description')
        .eq('country_id', countryId)
        .order('display_order'),
      supabase
        .from('banknote_sort_options')
        .select('id, name, field_name, is_default, is_required, display_order')
        .eq('country_id', countryId)
        .order('display_order')
    ]);

    return {
      categories: categoriesResult.data || [],
      types: typesResult.data || [],
      sortOptions: sortOptionsResult.data || [],
      errors: {
        categories: categoriesResult.error,
        types: typesResult.error,
        sortOptions: sortOptionsResult.error
      }
    };
  } catch (error) {
    console.error('[fetchCountryFilterMetadata] Unexpected error:', error);
    return {
      categories: [],
      types: [],
      sortOptions: [],
      errors: { categories: null, types: null, sortOptions: null }
    };
  }
}