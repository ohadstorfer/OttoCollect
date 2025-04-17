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
      series: banknote.category || '', // Map category to series
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

// Update fetchBanknotesByCountryId to use filters, categories, types and sort options
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
    
    console.log(`Found country name: ${country.name} for ID: ${countryId}`);
    
    // Build the query with filters
    let query = supabase
      .from('detailed_banknotes')
      .select('*')
      .eq('country', country.name);
    
    // Apply additional filters
    if (filters?.search) {
      // Search across multiple fields
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      query = query.or(
        `extended_pick_number.ilike.${searchTerm},` +
        `face_value.ilike.${searchTerm},` + 
        `banknote_description.ilike.${searchTerm},` +
        `sultan_name.ilike.${searchTerm}`
      );
    }
    
    // Filter by categories if provided
    if (filters?.categories && filters.categories.length > 0) {
      // First get the actual category names from the category IDs
      const { data: categoryData } = await supabase
        .from('banknote_category_definitions')
        .select('name')
        .in('id', filters.categories);
      
      if (categoryData && categoryData.length > 0) {
        const categoryNames = categoryData.map(cat => cat.name);
        console.log('Filtering by categories:', categoryNames);
        query = query.in('category', categoryNames);
      }
    }
    
    // Filter by types if provided
    if (filters?.types && filters.types.length > 0) {
      // First get the actual type names from the type IDs
      const { data: typeData } = await supabase
        .from('banknote_type_definitions')
        .select('name')
        .in('id', filters.types);
      
      if (typeData && typeData.length > 0) {
        const typeNames = typeData.map(type => type.name);
        console.log('Filtering by types:', typeNames);
        query = query.in('type', typeNames);
      }
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching banknotes by country:', error);
      return [];
    }
    
    console.log(`Found ${data?.length || 0} banknotes for country: ${country.name}`);
    
    // Convert database fields to client-side model
    const banknotes = data?.map(item => ({
      id: item.id,
      catalogId: item.extended_pick_number || '',
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
    } as DetailedBanknote)) || [];
    
    // Sort the banknotes if sort options are provided
    if (filters?.sort && filters.sort.length > 0) {
      console.log('Sorting banknotes by:', filters.sort);
      
      banknotes.sort((a, b) => {
        // Apply sorting based on selected criteria
        for (const fieldName of filters.sort) {
          let comparison = 0;

          switch (fieldName) {
            case "sultan":
              comparison = (a.sultanName || "")
                .localeCompare(b.sultanName || "");
              break;

            case "faceValue":
              const valueA = a.denomination || "";
              const valueB = b.denomination || "";
              const isKurushA = String(valueA).toLowerCase().includes("kurush");
              const isKurushB = String(valueB).toLowerCase().includes("kurush");
              const isLiraA = String(valueA).toLowerCase().includes("lira");
              const isLiraB = String(valueB).toLowerCase().includes("lira");

              if (isKurushA && isLiraB) comparison = -1;
              else if (isLiraA && isKurushB) comparison = 1;
              else {
                const numA = parseFloat(String(valueA).replace(/[^0-9.]/g, "")) || 0;
                const numB = parseFloat(String(valueB).replace(/[^0-9.]/g, "")) || 0;
                comparison = numA - numB;
              }
              break;

            case "extPick":
              comparison = (a.catalogId || "")
                .localeCompare(b.catalogId || "");
              break;
              
            case "newest":
              const dateA = new Date(a.createdAt || "").getTime();
              const dateB = new Date(b.createdAt || "").getTime();
              comparison = dateB - dateA; // Newest first
              break;
          }

          if (comparison !== 0) return comparison;
        }

        return 0;
      });
    }
    
    // Group banknotes by category and organize by sultan if needed
    const groupedBanknotes = groupBanknotesByCategory(banknotes, filters?.sort?.includes('sultan') || false);
    console.log(`Grouped banknotes into ${groupedBanknotes.length} categories`);
    
    return banknotes;
  } catch (error) {
    console.error('Unexpected error in fetchBanknotesByCountryId:', error);
    return [];
  }
}

// Helper function to group banknotes by category
function groupBanknotesByCategory(
  banknotes: DetailedBanknote[], 
  groupBySultan: boolean
) {
  const categoryMap = new Map<string, { 
    category: string, 
    items: DetailedBanknote[],
    sultanGroups?: { sultan: string, items: DetailedBanknote[] }[]
  }>();
  
  // Group by category
  banknotes.forEach(banknote => {
    const category = banknote.category || 'Uncategorized';
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { 
        category, 
        items: [] 
      });
    }
    
    categoryMap.get(category)?.items.push(banknote);
  });
  
  // If grouping by sultan is enabled, create sultan groups within each category
  if (groupBySultan) {
    categoryMap.forEach((categoryGroup) => {
      const sultanMap = new Map<string, DetailedBanknote[]>();
      
      categoryGroup.items.forEach(banknote => {
        const sultan = banknote.sultanName || 'Unknown';
        
        if (!sultanMap.has(sultan)) {
          sultanMap.set(sultan, []);
        }
        
        sultanMap.get(sultan)?.push(banknote);
      });
      
      // Create sultan groups
      categoryGroup.sultanGroups = Array.from(sultanMap.entries())
        .map(([sultan, items]) => ({ sultan, items }))
        .sort((a, b) => a.sultan.localeCompare(b.sultan));
    });
  }
  
  return Array.from(categoryMap.values())
    .sort((a, b) => a.category.localeCompare(b.category));
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
