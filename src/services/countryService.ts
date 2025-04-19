
import { supabase } from "@/integrations/supabase/client";
import { 
  CategoryDefinition, 
  TypeDefinition, 
  SortOption, 
  UserFilterPreference,
  Country
} from "@/types/filter";

// Create a simple cache to avoid redundant requests
const cache = {
  countries: null as Country[] | null,
  categoriesByCountry: new Map<string, CategoryDefinition[]>(),
  typesByCountry: new Map<string, TypeDefinition[]>(),
  sortOptionsByCountry: new Map<string, SortOption[]>(),
  userPreferences: new Map<string, UserFilterPreference>(),
};

/**
 * Clear the cache or specific parts of it
 */
export const clearCache = (key?: string) => {
  if (!key) {
    cache.countries = null;
    cache.categoriesByCountry.clear();
    cache.typesByCountry.clear();
    cache.sortOptionsByCountry.clear();
    cache.userPreferences.clear();
    return;
  }

  if (key === 'countries') cache.countries = null;
  else if (key === 'categories') cache.categoriesByCountry.clear();
  else if (key === 'types') cache.typesByCountry.clear();
  else if (key === 'sortOptions') cache.sortOptionsByCountry.clear();
  else if (key === 'userPreferences') cache.userPreferences.clear();
};

/**
 * Fetch all countries from the database
 */
export const fetchCountries = async (): Promise<Country[]> => {
  if (cache.countries) {
    return cache.countries;
  }

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching countries:', error);
    return [];
  }

  // Store in cache
  cache.countries = data;
  return data;
};

/**
 * Fetch a country by name
 */
export const fetchCountryByName = async (name: string): Promise<Country | null> => {
  // Check cache first
  if (cache.countries) {
    const country = cache.countries.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (country) return country;
  }

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .ilike('name', name)
    .single();

  if (error) {
    console.error(`Error fetching country "${name}":`, error);
    return null;
  }

  return data;
};

/**
 * Fetch categories by country ID
 */
export const fetchCategoriesByCountryId = async (countryId: string): Promise<CategoryDefinition[]> => {
  // Check cache first
  if (cache.categoriesByCountry.has(countryId)) {
    return cache.categoriesByCountry.get(countryId) || [];
  }

  const { data, error } = await supabase
    .from('banknote_category_definitions')
    .select('*')
    .eq('country_id', countryId)
    .order('display_order');

  if (error) {
    console.error(`Error fetching categories for country ${countryId}:`, error);
    return [];
  }

  // Store in cache
  cache.categoriesByCountry.set(countryId, data);
  return data;
};

/**
 * Fetch types by country ID
 */
export const fetchTypesByCountryId = async (countryId: string): Promise<TypeDefinition[]> => {
  // Check cache first
  if (cache.typesByCountry.has(countryId)) {
    return cache.typesByCountry.get(countryId) || [];
  }

  const { data, error } = await supabase
    .from('banknote_type_definitions')
    .select('*')
    .eq('country_id', countryId)
    .order('display_order');

  if (error) {
    console.error(`Error fetching types for country ${countryId}:`, error);
    return [];
  }

  // Store in cache
  cache.typesByCountry.set(countryId, data);
  return data;
};

/**
 * Fetch sort options by country ID
 */
export const fetchSortOptionsByCountryId = async (countryId: string): Promise<SortOption[]> => {
  // Check cache first
  if (cache.sortOptionsByCountry.has(countryId)) {
    return cache.sortOptionsByCountry.get(countryId) || [];
  }

  const { data, error } = await supabase
    .from('banknote_sort_options')
    .select('*')
    .eq('country_id', countryId)
    .order('display_order');

  if (error) {
    console.error(`Error fetching sort options for country ${countryId}:`, error);
    return [];
  }

  // Store in cache
  cache.sortOptionsByCountry.set(countryId, data);
  return data;
};

/**
 * Fetch user filter preferences for a specific country
 */
export const fetchUserFilterPreferences = async (
  userId: string,
  countryId: string
): Promise<UserFilterPreference | null> => {
  const cacheKey = `${userId}-${countryId}`;
  
  // Check cache first
  if (cache.userPreferences.has(cacheKey)) {
    return cache.userPreferences.get(cacheKey) || null;
  }

  const { data, error } = await supabase
    .from('user_filter_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('country_id', countryId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
      console.error(`Error fetching user filter preferences for country ${countryId}:`, error);
    }
    return null;
  }

  // Store in cache
  cache.userPreferences.set(cacheKey, data);
  return data;
};

/**
 * Save user filter preferences for a specific country
 */
export const saveUserFilterPreferences = async (
  userId: string,
  countryId: string,
  selectedCategories: string[],
  selectedTypes: string[],
  selectedSortOptions: string[]
): Promise<boolean> => {
  // Check if preferences already exist
  const existingPrefs = await fetchUserFilterPreferences(userId, countryId);
  
  let result;
  if (existingPrefs) {
    // Update existing preferences
    result = await supabase
      .from('user_filter_preferences')
      .update({
        selected_categories: selectedCategories,
        selected_types: selectedTypes,
        selected_sort_options: selectedSortOptions,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingPrefs.id);
  } else {
    // Create new preferences
    result = await supabase
      .from('user_filter_preferences')
      .insert([{
        user_id: userId,
        country_id: countryId,
        selected_categories: selectedCategories,
        selected_types: selectedTypes,
        selected_sort_options: selectedSortOptions
      }]);
  }

  if (result.error) {
    console.error('Error saving user filter preferences:', result.error);
    return false;
  }

  // Clear cache entry
  const cacheKey = `${userId}-${countryId}`;
  cache.userPreferences.delete(cacheKey);
  
  return true;
};

// Category CRUD operations
export const createCategory = async (
  countryId: string,
  name: string,
  description: string = '',
  displayOrder: number = 0
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_category_definitions')
    .insert([{
      country_id: countryId,
      name,
      description,
      display_order: displayOrder
    }]);

  if (error) {
    console.error('Error creating category:', error);
    return false;
  }

  // Clear cache for this country's categories
  cache.categoriesByCountry.delete(countryId);
  return true;
};

export const updateCategory = async (
  categoryId: string,
  countryId: string,
  updates: Partial<{
    name: string;
    description: string;
    display_order: number;
  }>
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_category_definitions')
    .update(updates)
    .eq('id', categoryId);

  if (error) {
    console.error('Error updating category:', error);
    return false;
  }

  // Clear cache for this country's categories
  cache.categoriesByCountry.delete(countryId);
  return true;
};

export const deleteCategory = async (
  categoryId: string, 
  countryId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_category_definitions')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }

  // Clear cache for this country's categories
  cache.categoriesByCountry.delete(countryId);
  return true;
};

// Type CRUD operations
export const createType = async (
  countryId: string,
  name: string,
  description: string = '',
  displayOrder: number = 0
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_type_definitions')
    .insert([{
      country_id: countryId,
      name,
      description,
      display_order: displayOrder
    }]);

  if (error) {
    console.error('Error creating type:', error);
    return false;
  }

  // Clear cache for this country's types
  cache.typesByCountry.delete(countryId);
  return true;
};

export const updateType = async (
  typeId: string,
  countryId: string,
  updates: Partial<{
    name: string;
    description: string;
    display_order: number;
  }>
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_type_definitions')
    .update(updates)
    .eq('id', typeId);

  if (error) {
    console.error('Error updating type:', error);
    return false;
  }

  // Clear cache for this country's types
  cache.typesByCountry.delete(countryId);
  return true;
};

export const deleteType = async (
  typeId: string, 
  countryId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_type_definitions')
    .delete()
    .eq('id', typeId);

  if (error) {
    console.error('Error deleting type:', error);
    return false;
  }

  // Clear cache for this country's types
  cache.typesByCountry.delete(countryId);
  return true;
};

// Sort option CRUD operations
export const createSortOption = async (
  countryId: string,
  name: string,
  fieldName: string,
  isDefault: boolean = false,
  isRequired: boolean = false,
  displayOrder: number = 0,
  description: string = '',
  selectOne: boolean = false
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_sort_options')
    .insert([{
      country_id: countryId,
      name,
      field_name: fieldName,
      is_default: isDefault,
      is_required: isRequired,
      display_order: displayOrder,
      description,
      select_one: selectOne
    }]);

  if (error) {
    console.error('Error creating sort option:', error);
    return false;
  }

  // Clear cache for this country's sort options
  cache.sortOptionsByCountry.delete(countryId);
  return true;
};

export const updateSortOption = async (
  optionId: string,
  countryId: string,
  updates: Partial<{
    name: string;
    field_name: string;
    is_default: boolean;
    is_required: boolean;
    display_order: number;
    description: string;
    select_one: boolean;
  }>
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_sort_options')
    .update(updates)
    .eq('id', optionId);

  if (error) {
    console.error('Error updating sort option:', error);
    return false;
  }

  // Clear cache for this country's sort options
  cache.sortOptionsByCountry.delete(countryId);
  return true;
};

export const deleteSortOption = async (
  optionId: string, 
  countryId: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('banknote_sort_options')
    .delete()
    .eq('id', optionId);

  if (error) {
    console.error('Error deleting sort option:', error);
    return false;
  }

  // Clear cache for this country's sort options
  cache.sortOptionsByCountry.delete(countryId);
  return true;
};
