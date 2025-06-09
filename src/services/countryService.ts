import { supabase } from "@/integrations/supabase/client";
import { CategoryDefinition, TypeDefinition, SortOption, UserFilterPreference, CountryData } from "@/types/filter";

export async function fetchCountries(): Promise<CountryData[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching countries:", error);
      throw error;
    }

    return data as CountryData[];
  } catch (error) {
    console.error("Error in fetchCountries:", error);
    return [];
  }
}

export async function fetchCountryById(countryId: string): Promise<CountryData | null> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', countryId)
      .single();

    if (error) {
      console.error(`Error fetching country with ID ${countryId}:`, error);
      return null;
    }

    return data as CountryData;
  } catch (error) {
    console.error("Error in fetchCountryById:", error);
    return null;
  }
}

export async function fetchCountryByName(countryName: string): Promise<CountryData | null> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('name', countryName)
      .single();

    if (error) {
      console.error(`Error fetching country with name ${countryName}:`, error);
      return null;
    }

    return data as CountryData;
  } catch (error) {
    console.error("Error in fetchCountryByName:", error);
    return null;
  }
}

export async function fetchCategoriesByCountryId(countryId: string): Promise<CategoryDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error(`Error fetching categories for country ID ${countryId}:`, error);
      throw error;
    }

    return data as CategoryDefinition[];
  } catch (error) {
    console.error("Error in fetchCategoriesByCountryId:", error);
    return [];
  }
}

export async function fetchTypesByCountryId(countryId: string): Promise<TypeDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error(`Error fetching types for country ID ${countryId}:`, error);
      throw error;
    }

    return data as TypeDefinition[];
  } catch (error) {
    console.error("Error in fetchTypesByCountryId:", error);
    return [];
  }
}

export async function fetchSortOptionsByCountryId(countryId: string): Promise<SortOption[]> {
  try {
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error(`Error fetching sort options for country ID ${countryId}:`, error);
      throw error;
    }

    return data as SortOption[];
  } catch (error) {
    console.error("Error in fetchSortOptionsByCountryId:", error);
    return [];
  }
}

export async function fetchUserFilterPreferences(userId: string, countryId: string): Promise<UserFilterPreference | null> {
  try {
    const { data, error } = await supabase
      .from('user_filter_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching user filter preferences for user ID ${userId} and country ID ${countryId}:`, error);
      return null;
    }
    console.log("User filter preferences:", data);
    return data as UserFilterPreference;
  } catch (error) {
    console.error("Error in fetchUserFilterPreferences:", error);
    return null;
  }
}

export async function saveUserFilterPreferences(
  userId: string,
  countryId: string,
  selectedCategories: string[],
  selectedTypes: string[],
  selectedSortOptions: string[],
  groupMode: boolean
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_filter_preferences')
      .upsert(
        {
          user_id: userId,
          country_id: countryId,
          selected_categories: selectedCategories,
          selected_types: selectedTypes,
          selected_sort_options: selectedSortOptions,
          group_mode: groupMode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,country_id' }
      );

    if (error) {
      console.error("Error saving user filter preferences:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in saveUserFilterPreferences:", error);
  }
}

export async function createCategory(
  countryId: string,
  name: string,
  description: string,
  displayOrder: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_category_definitions')
      .insert({
        country_id: countryId,
        name,
        description,
        display_order: displayOrder,
      });

    if (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in createCategory:", error);
    throw error;
  }
}

export async function updateCategory(
  categoryId: string,
  countryId: string,
  updates: {
    name?: string;
    description?: string;
    display_order?: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_category_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .eq('country_id', countryId);

    if (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in updateCategory:", error);
    throw error;
  }
}

export async function deleteCategory(
  categoryId: string,
  countryId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_category_definitions')
      .delete()
      .eq('id', categoryId)
      .eq('country_id', countryId);

    if (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
}

export async function createType(
  countryId: string,
  name: string,
  description: string,
  displayOrder: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_type_definitions')
      .insert({
        country_id: countryId,
        name,
        description,
        display_order: displayOrder,
      });

    if (error) {
      console.error("Error creating type:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in createType:", error);
    throw error;
  }
}

export async function updateType(
  typeId: string,
  countryId: string,
  updates: {
    name?: string;
    description?: string;
    display_order?: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_type_definitions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', typeId)
      .eq('country_id', countryId);

    if (error) {
      console.error("Error updating type:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in updateType:", error);
    throw error;
  }
}

export async function deleteType(
  typeId: string,
  countryId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_type_definitions')
      .delete()
      .eq('id', typeId)
      .eq('country_id', countryId);

    if (error) {
      console.error("Error deleting type:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteType:", error);
    throw error;
  }
}

export async function createSortOption(
  countryId: string,
  name: string,
  fieldName: string,
  isDefault: boolean,
  isRequired: boolean,
  displayOrder: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_sort_options')
      .insert({
        country_id: countryId,
        name,
        field_name: fieldName,
        is_default: isDefault,
        is_required: isRequired,
        display_order: displayOrder,
      });

    if (error) {
      console.error("Error creating sort option:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in createSortOption:", error);
    throw error;
  }
}

export async function updateSortOption(
  id: string,
  countryId: string,
  data: {
    name?: string;
    field_name?: string;
    description?: string;
    is_default?: boolean;
    is_required?: boolean;
    display_order?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('banknote_sort_options')
      .update(data)
      .eq('id', id)
      .eq('country_id', countryId);

    if (error) {
      console.error('Error updating sort option:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateSortOption:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function deleteSortOption(
  sortOptionId: string,
  countryId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('banknote_sort_options')
      .delete()
      .eq('id', sortOptionId)
      .eq('country_id', countryId);

    if (error) {
      console.error("Error deleting sort option:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteSortOption:", error);
    throw error;
  }
}
