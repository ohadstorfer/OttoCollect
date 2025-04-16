
import { supabase } from "@/integrations/supabase/client";
import { Country, CategoryDefinition, TypeDefinition, SortOption, UserFilterPreference } from "@/types/filter";

export async function fetchCountries(): Promise<Country[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching countries:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCountries:', error);
    return [];
  }
}

export async function fetchCountryById(id: string): Promise<Country | null> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error fetching country:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching country with id ${id}:`, error);
    return null;
  }
}

export async function fetchCountryByName(name: string): Promise<Country | null> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) {
      console.error("Error fetching country by name:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching country with name ${name}:`, error);
    return null;
  }
}

export async function fetchCategoriesByCountryId(countryId: string): Promise<CategoryDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching categories for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchTypesByCountryId(countryId: string): Promise<TypeDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("Error fetching types:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching types for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchSortOptionsByCountryId(countryId: string): Promise<SortOption[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("Error fetching sort options:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error fetching sort options for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchUserFilterPreferences(userId: string, countryId: string): Promise<UserFilterPreference | null> {
  if (!userId) return null;
  
  try {
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
    
    return data || null;
  } catch (error) {
    console.error(`Error fetching filter preferences for user ${userId} and country ${countryId}:`, error);
    return null;
  }
}

export async function saveUserFilterPreferences(
  userId: string, 
  countryId: string, 
  selectedCategories: string[],
  selectedTypes: string[],
  selectedSortOptions: string[]
): Promise<void> {
  if (!userId) return;
  
  try {
    const existingPrefs = await fetchUserFilterPreferences(userId, countryId);
    
    if (existingPrefs) {
      // Update existing preferences
      const { error } = await supabase
        .from('user_filter_preferences')
        .update({
          selected_categories: selectedCategories,
          selected_types: selectedTypes,
          selected_sort_options: selectedSortOptions,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPrefs.id);
      
      if (error) {
        console.error("Error updating user filter preferences:", error);
        throw error;
      }
    } else {
      // Create new preferences
      const { error } = await supabase
        .from('user_filter_preferences')
        .insert({
          user_id: userId,
          country_id: countryId,
          selected_categories: selectedCategories,
          selected_types: selectedTypes,
          selected_sort_options: selectedSortOptions
        });
      
      if (error) {
        console.error("Error creating user filter preferences:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error saving filter preferences:`, error);
  }
}
