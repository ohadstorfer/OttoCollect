
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
    
    console.log(`Found country name: ${country.name} for ID: ${countryId}`);
    
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
          console.log('Filtering by categories:', categoryNames);
        }
      } catch (err) {
        console.error('Error fetching category names:', err);
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
          console.log('Filtering by types:', typeNames);
        }
      } catch (err) {
        console.error('Error fetching type names:', err);
      }
    }
    
    // Build the query with the country filter
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
      console.error('Error fetching banknotes by country:', error);
      return [];
    }
    
    // Filter by category and type on the server side
    let filteredData = [...data];
    
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
    
    console.log(`Found ${filteredData.length} banknotes for country: ${country.name}`);
    
    // Map database fields to client-side model
    const banknotes = filteredData.map(mapBanknoteFromDatabase);
    
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
              comparison = (a.extendedPickNumber || "")
                .localeCompare(b.extendedPickNumber || "");
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
    
    return banknotes;
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
