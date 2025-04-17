
import { supabase } from '@/integrations/supabase/client';
import { CategoryDefinition, TypeDefinition, SortOption, UserFilterPreference, Country, DynamicFilterState } from '@/types/filter';

// Fetch all countries
export async function fetchCountries(): Promise<Country[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

// Fetch country by name
export async function fetchCountryByName(name: string): Promise<Country | null> {
  try {
    console.log("countryService: Fetching country by name:", name);
    
    // Try to use cached data first
    const cacheKey = `country-by-name-${name}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log("countryService: Using cached data for", cacheKey);
      return JSON.parse(cachedData);
    }
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      console.error("Error fetching country by name:", error);
      throw error;
    }

    // Cache the result
    if (data) {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching country by name ${name}:`, error);
    return null;
  }
}

// Fetch categories by country ID
export async function fetchCategoriesByCountryId(countryId: string): Promise<CategoryDefinition[]> {
  try {
    // Try to use cached data first
    const cacheKey = `categories-by-country-${countryId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log("countryService: Using cached data for", cacheKey);
      return JSON.parse(cachedData);
    }
    
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');

    if (error) {
      console.error("Error fetching categories by country ID:", error);
      throw error;
    }
    
    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching categories for country ${countryId}:`, error);
    return [];
  }
}

// Fetch types by country ID
export async function fetchTypesByCountryId(countryId: string): Promise<TypeDefinition[]> {
  try {
    // Try to use cached data first
    const cacheKey = `types-by-country-${countryId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log("countryService: Using cached data for", cacheKey);
      return JSON.parse(cachedData);
    }
    
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');

    if (error) {
      console.error("Error fetching types by country ID:", error);
      throw error;
    }

    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching types for country ${countryId}:`, error);
    return [];
  }
}

// Fetch sort options by country ID
export async function fetchSortOptionsByCountryId(countryId: string): Promise<SortOption[]> {
  try {
    // Try to use cached data first
    const cacheKey = `sort-options-by-country-${countryId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log("countryService: Using cached data for", cacheKey);
      return JSON.parse(cachedData);
    }
    
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');

    if (error) {
      console.error("Error fetching sort options by country ID:", error);
      throw error;
    }

    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching sort options for country ${countryId}:`, error);
    return [];
  }
}

// Fetch user filter preferences
export async function fetchUserFilterPreferences(userId: string, countryId: string): Promise<UserFilterPreference | null> {
  if (!userId || !countryId) {
    return null;
  }
  
  try {
    console.log("countryService: Fetching filter preferences for user", userId, "and country", countryId);
    
    const cacheKey = `user-filter-preferences-${userId}-${countryId}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      console.log("countryService: Using cached data for", cacheKey);
      return JSON.parse(cachedData);
    }
    
    const { data, error } = await supabase
      .from('user_filter_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error("Error fetching user filter preferences:", error);
      throw error;
    }

    if (data) {
      console.log("countryService: Found user preferences:", {
        categories: data.selected_categories.length,
        types: data.selected_types.length,
        sortOptions: data.selected_sort_options.length
      });
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }
    
    return data || null;
  } catch (error) {
    console.error(`Error fetching filter preferences for user ${userId}:`, error);
    return null;
  }
}

// Save user filter preferences
export async function saveUserFilterPreferences(
  userId: string, 
  countryId: string, 
  categories: string[], 
  types: string[],
  sortOptions: string[]
): Promise<UserFilterPreference | null> {
  if (!userId || !countryId) {
    console.error("countryService: Cannot save preferences without user ID and country ID");
    return null;
  }
  
  try {
    console.log("countryService: Saving preferences", { userId, countryId, categories, types, sortOptions });
    
    // First check if preferences already exist
    const { data: existingPrefs, error: checkError } = await supabase
      .from('user_filter_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing user filter preferences:", checkError);
      throw checkError;
    }

    let result;
    
    if (existingPrefs) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('user_filter_preferences')
        .update({
          selected_categories: categories,
          selected_types: types,
          selected_sort_options: sortOptions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPrefs.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating user filter preferences:", error);
        throw error;
      }
      
      console.log("countryService: Successfully updated preferences");
      result = data;
    } else {
      // Insert new preferences
      const { data, error } = await supabase
        .from('user_filter_preferences')
        .insert({
          user_id: userId,
          country_id: countryId,
          selected_categories: categories,
          selected_types: types,
          selected_sort_options: sortOptions
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating user filter preferences:", error);
        throw error;
      }
      
      console.log("countryService: Successfully created preferences");
      result = data;
    }

    // Update the cache
    if (result) {
      const cacheKey = `user-filter-preferences-${userId}-${countryId}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    }
    
    return result || null;
  } catch (error) {
    console.error(`Error saving filter preferences for user ${userId}:`, error);
    return null;
  }
}

// Create a new category
export async function createCategory(countryId: string, name: string, description?: string, displayOrder?: number): Promise<CategoryDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .insert({
        country_id: countryId,
        name,
        description,
        display_order: displayOrder || 0
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating category:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`categories-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error creating category:`, error);
    return null;
  }
}

// Update a category
export async function updateCategory(categoryId: string, countryId: string, updates: Partial<CategoryDefinition>): Promise<CategoryDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error("Error updating category:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`categories-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error updating category:`, error);
    return null;
  }
}

// Delete a category
export async function deleteCategory(categoryId: string, countryId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('banknote_category_definitions')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`categories-by-country-${countryId}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting category:`, error);
    return false;
  }
}

// Create, update, and delete type definitions
export async function createType(countryId: string, name: string, description?: string, displayOrder?: number): Promise<TypeDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .insert({
        country_id: countryId,
        name,
        description,
        display_order: displayOrder || 0
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating type:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`types-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error creating type:`, error);
    return null;
  }
}

export async function updateType(typeId: string, countryId: string, updates: Partial<TypeDefinition>): Promise<TypeDefinition | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', typeId)
      .select()
      .single();

    if (error) {
      console.error("Error updating type:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`types-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error updating type:`, error);
    return null;
  }
}

export async function deleteType(typeId: string, countryId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('banknote_type_definitions')
      .delete()
      .eq('id', typeId);

    if (error) {
      console.error("Error deleting type:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`types-by-country-${countryId}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting type:`, error);
    return false;
  }
}

// Create, update, and delete sort options
export async function createSortOption(countryId: string, name: string, fieldName: string, isDefault: boolean = false, isRequired: boolean = false, displayOrder?: number): Promise<SortOption | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .insert({
        country_id: countryId,
        name,
        field_name: fieldName,
        is_default: isDefault,
        is_required: isRequired,
        display_order: displayOrder || 0
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating sort option:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`sort-options-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error creating sort option:`, error);
    return null;
  }
}

export async function updateSortOption(sortOptionId: string, countryId: string, updates: Partial<SortOption>): Promise<SortOption | null> {
  try {
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sortOptionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating sort option:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`sort-options-by-country-${countryId}`);
    
    return data;
  } catch (error) {
    console.error(`Error updating sort option:`, error);
    return null;
  }
}

export async function deleteSortOption(sortOptionId: string, countryId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('banknote_sort_options')
      .delete()
      .eq('id', sortOptionId);

    if (error) {
      console.error("Error deleting sort option:", error);
      throw error;
    }
    
    // Clear cache
    sessionStorage.removeItem(`sort-options-by-country-${countryId}`);
    
    return true;
  } catch (error) {
    console.error(`Error deleting sort option:`, error);
    return false;
  }
}
