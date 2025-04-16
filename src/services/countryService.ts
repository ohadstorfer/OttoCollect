
import { supabase } from "@/integrations/supabase/client";
import { Country, CategoryDefinition, TypeDefinition, SortOption, UserFilterPreference } from "@/types/filter";

export async function fetchCountries(): Promise<Country[]> {
  try {
    console.log("countryService: Fetching countries");
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("countryService: Error fetching countries:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched ${data?.length || 0} countries`);
    return data || [];
  } catch (error) {
    console.error('countryService: Error in fetchCountries:', error);
    return [];
  }
}

export async function fetchCountryById(id: string): Promise<Country | null> {
  try {
    console.log(`countryService: Fetching country by ID: ${id}`);
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("countryService: Error fetching country:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched country: ${data?.name || 'not found'}`);
    return data;
  } catch (error) {
    console.error(`countryService: Error fetching country with id ${id}:`, error);
    return null;
  }
}

export async function fetchCountryByName(name: string): Promise<Country | null> {
  try {
    console.log(`countryService: Fetching country by name: ${name}`);
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('name', name)
      .single();
    
    if (error) {
      console.error("countryService: Error fetching country by name:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched country ID: ${data?.id || 'not found'}`);
    return data;
  } catch (error) {
    console.error(`countryService: Error fetching country with name ${name}:`, error);
    return null;
  }
}

export async function fetchCategoriesByCountryId(countryId: string): Promise<CategoryDefinition[]> {
  try {
    console.log(`countryService: Fetching categories for country: ${countryId}`);
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("countryService: Error fetching categories:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched ${data?.length || 0} categories`);
    return data || [];
  } catch (error) {
    console.error(`countryService: Error fetching categories for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchTypesByCountryId(countryId: string): Promise<TypeDefinition[]> {
  try {
    console.log(`countryService: Fetching types for country: ${countryId}`);
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("countryService: Error fetching types:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched ${data?.length || 0} types`);
    return data || [];
  } catch (error) {
    console.error(`countryService: Error fetching types for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchSortOptionsByCountryId(countryId: string): Promise<SortOption[]> {
  try {
    console.log(`countryService: Fetching sort options for country: ${countryId}`);
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order');
    
    if (error) {
      console.error("countryService: Error fetching sort options:", error);
      throw error;
    }
    
    console.log(`countryService: Fetched ${data?.length || 0} sort options`);
    return data || [];
  } catch (error) {
    console.error(`countryService: Error fetching sort options for country ${countryId}:`, error);
    return [];
  }
}

export async function fetchUserFilterPreferences(userId: string | undefined, countryId: string): Promise<UserFilterPreference | null> {
  // Don't try to fetch preferences if no user ID
  if (!userId) {
    console.log("countryService: No user ID provided for filter preferences");
    return null;
  }
  
  try {
    console.log(`countryService: Fetching filter preferences for user ${userId} and country ${countryId}`);
    
    const { data, error } = await supabase
      .from('user_filter_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .maybeSingle();
    
    if (error) {
      console.error("countryService: Error fetching user filter preferences:", error);
      return null;
    }
    
    if (data) {
      console.log("countryService: Found user preferences:", {
        categories: data.selected_categories?.length || 0,
        types: data.selected_types?.length || 0,
        sortOptions: data.selected_sort_options?.length || 0
      });
    } else {
      console.log("countryService: No user preferences found");
    }
    
    return data;
  } catch (error) {
    console.error(`countryService: Error fetching filter preferences:`, error);
    return null;
  }
}

export async function saveUserFilterPreferences(
  userId: string | undefined, 
  countryId: string, 
  selectedCategories: string[],
  selectedTypes: string[],
  selectedSortOptions: string[]
): Promise<void> {
  if (!userId) {
    console.log("countryService: No user ID provided, not saving filter preferences");
    return;
  }
  
  try {
    const existingPrefs = await fetchUserFilterPreferences(userId, countryId);
    
    console.log("countryService: Saving preferences", {
      userId,
      countryId,
      categories: selectedCategories.length,
      types: selectedTypes.length,
      sortOptions: selectedSortOptions.length,
      updating: existingPrefs ? true : false
    });
    
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
        console.error("countryService: Error updating user filter preferences:", error);
      } else {
        console.log("countryService: Successfully updated preferences");
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
        console.error("countryService: Error creating user filter preferences:", error);
      } else {
        console.log("countryService: Successfully created preferences");
      }
    }
  } catch (error) {
    console.error(`countryService: Error saving filter preferences:`, error);
  }
}
