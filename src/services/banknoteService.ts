
import { supabase } from '@/integrations/supabase/client';
import { DetailedBanknote, BanknoteFilters, SortField, Currency } from '@/types';

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
  filters: {
    search?: string;
    categories?: string[];
    types?: string[];
    sort?: string[];
  } = {}
): Promise<DetailedBanknote[]> {
  try {
    console.log("fetchBanknotesByCountryId called with filters:", filters);

    // Start building the query
    let query = supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('is_approved', true);

    // Add search filter if provided
    if (filters.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.or(`
        face_value.ilike.${searchTerm},
        pick_number.ilike.${searchTerm},
        extended_pick_number.ilike.${searchTerm},
        category.ilike.${searchTerm},
        type.ilike.${searchTerm},
        sultan_name.ilike.${searchTerm},
        country.ilike.${searchTerm}
      `);
    }

    // Filter by country ID based on the country name
    if (countryId) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('name')
        .eq('id', countryId)
        .single();

      if (countryData) {
        query = query.eq('country', countryData.name);
      }
    }

    // Apply category filters
    if (filters.categories && filters.categories.length > 0) {
      // Get the category names from their IDs
      const { data: categoryData, error: categoryError } = await supabase
        .from('banknote_category_definitions')
        .select('name')
        .in('id', filters.categories);

      if (categoryError) {
        console.error("Error fetching category names:", categoryError);
      } else if (categoryData && categoryData.length > 0) {
        const categoryNames = categoryData.map(cat => cat.name.toLowerCase());
        if (categoryNames.length > 0) {
          // Create a filter condition for categories
          const categoryFilters = categoryNames.map(name => `category.ilike.%${name}%`);
          query = query.or(categoryFilters.join(','));
        }
      }
    }

    // Apply type filters
    if (filters.types && filters.types.length > 0) {
      // Get the type names from their IDs
      const { data: typeData, error: typeError } = await supabase
        .from('banknote_type_definitions')
        .select('name')
        .in('id', filters.types);

      if (typeError) {
        console.error("Error fetching type names:", typeError);
      } else if (typeData && typeData.length > 0) {
        const typeNames = typeData.map(type => type.name.toLowerCase());
        if (typeNames.length > 0) {
          // Create a filter condition for types
          const typeFilters = typeNames.map(name => `type.ilike.%${name}%`);
          query = query.or(typeFilters.join(','));
        }
      }
    }

    // Handle sorting based on selected sort option
    if (filters.sort && filters.sort.length > 0) {
      const primarySort = filters.sort[0];
      
      // Get the sort option ID for the field name
      const { data: sortOptionsData, error: sortOptionsError } = await supabase
        .from('banknote_sort_options')
        .select('id')
        .eq('field_name', primarySort)
        .eq('country_id', countryId)
        .limit(1);
      
      if (sortOptionsError) {
        console.error("Error fetching sort option:", sortOptionsError);
      } else if (sortOptionsData && sortOptionsData.length > 0) {
        const sortOptionId = sortOptionsData[0].id;
        
        // For sultan sorting, we need to handle it differently
        if (primarySort === 'sultan') {
          // First get all sultan names from sort_fields table and their display order
          const { data: sultanSortFields, error: sultanSortError } = await supabase
            .from('sort_fields')
            .select('name, display_order')
            .eq('sort_option', sortOptionId)
            .order('display_order', { ascending: true });
          
          if (!sultanSortError && sultanSortFields && sultanSortFields.length > 0) {
            // We'll return the data and handle sultan grouping on client side
            // but with the known order from server
            console.log("Using sultan sort fields for ordering:", sultanSortFields);
            
            // Query the data without specific ordering
            const { data, error } = await query;
            
            if (error) {
              console.error("Error fetching banknotes:", error);
              return [];
            }
            
            // Map the database response to client model with sort fields
            return data.map(item => {
              const banknote = mapBanknoteFromDatabase(item);
              banknote._sortFields = sultanSortFields as SortField[];
              return banknote;
            });
          }
        } 
        // For currency/denomination sorting
        else if (primarySort === 'faceValue' || primarySort === 'currency' || primarySort === 'denomination') {
          // Get currency display orders first
          const { data: currencies, error: currencyError } = await supabase
            .from('currencies')
            .select('id, name, display_order')
            .eq('country_id', countryId)
            .order('display_order', { ascending: true });
          
          if (currencyError) {
            console.error("Error fetching currencies:", currencyError);
          } 
          
          // Get sort fields for face values
          const { data: faceValueSortFields, error: faceValueSortError } = await supabase
            .from('sort_fields')
            .select('name, display_order')
            .eq('sort_option', sortOptionId)
            .order('display_order', { ascending: true });
          
          if (faceValueSortError) {
            console.error("Error fetching face value sort fields:", faceValueSortError);
          }
          
          // Query the data without specific ordering
          const { data, error } = await query;
          
          if (error) {
            console.error("Error fetching banknotes:", error);
            return [];
          }
          
          // Map the database response to client model with sort fields and currencies
          return data.map(item => {
            const banknote = mapBanknoteFromDatabase(item);
            banknote._sortFields = faceValueSortFields as SortField[] || [];
            banknote._currencies = currencies as Currency[] || [];
            return banknote;
          });
        }
        // For other sort options that can be handled with direct sorting
        else {
          // Get the data
          const { data, error } = await query;
          
          if (error) {
            console.error("Error fetching banknotes:", error);
            return [];
          }
          
          // For other sort options, we'll sort on the server side
          // Get sort fields for this option
          const { data: sortFields, error: sortFieldsError } = await supabase
            .from('sort_fields')
            .select('name, display_order')
            .eq('sort_option', sortOptionId)
            .order('display_order', { ascending: true });
          
          if (sortFieldsError) {
            console.error("Error fetching sort fields:", sortFieldsError);
            return data.map(item => mapBanknoteFromDatabase(item));
          }
          
          // Map the database response to client model with sort fields
          return data.map(item => {
            const banknote = mapBanknoteFromDatabase(item);
            banknote._sortFields = sortFields as SortField[] || [];
            return banknote;
          });
        }
      }
    }
    
    // Default fetching without custom sorting
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching banknotes:", error);
      return [];
    }
    
    console.log(`Fetched ${data.length} banknotes for country ID ${countryId}`);
    return data.map(item => mapBanknoteFromDatabase(item));
  } catch (error) {
    console.error("Error in fetchBanknotesByCountryId:", error);
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
    _sortFields: item._sortFields,
    _currencies: item._currencies
  } as DetailedBanknote;
}
