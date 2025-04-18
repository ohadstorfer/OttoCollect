
import { supabase } from '@/integrations/supabase/client';
import { CountryData } from '@/types';

// Cache for country data to reduce duplicate calls
const countryCache = new Map<string, any>();
const categoryCache = new Map<string, any[]>();
const typeCache = new Map<string, any[]>();
const sortOptionCache = new Map<string, any[]>();
const userPreferencesCache = new Map<string, any>();

export async function fetchCountries(): Promise<CountryData[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }

    return data.map(country => ({
      id: country.id,
      name: country.name,
      description: country.description || '',
      imageUrl: country.image_url,
      created_at: country.created_at,
      updated_at: country.updated_at,
    }));
  } catch (error) {
    console.error('Unexpected error in fetchCountries:', error);
    return [];
  }
}

export async function fetchCountryById(id: string): Promise<CountryData | null> {
  try {
    // Check cache first
    if (countryCache.has(id)) {
      return countryCache.get(id);
    }
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching country by ID:', error);
      return null;
    }

    const countryData = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      imageUrl: data.image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    
    // Cache the result
    countryCache.set(id, countryData);
    
    return countryData;
  } catch (error) {
    console.error('Unexpected error in fetchCountryById:', error);
    return null;
  }
}

export async function fetchCountryByName(name: string): Promise<CountryData | null> {
  try {
    const cacheKey = `country-by-name-${name}`;
    
    // Check cache first
    if (countryCache.has(cacheKey)) {
      console.log("countryService: Using cached data for", cacheKey);
      return countryCache.get(cacheKey);
    }
    
    console.log("countryService: Fetching country by name:", name);
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .ilike('name', name)
      .single();

    if (error) {
      console.error('Error fetching country by name:', error);
      return null;
    }

    const countryData = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      imageUrl: data.image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    
    // Cache the result
    countryCache.set(cacheKey, countryData);
    
    return countryData;
  } catch (error) {
    console.error('Unexpected error in fetchCountryByName:', error);
    return null;
  }
}

// Fetch categories by country ID
export async function fetchCategoriesByCountryId(countryId: string) {
  try {
    const cacheKey = `categories-by-country-${countryId}`;
    
    // Check cache first
    if (categoryCache.has(cacheKey)) {
      console.log("countryService: Using cached data for", cacheKey);
      return categoryCache.get(cacheKey);
    }
    
    const { data, error } = await supabase
      .from('banknote_category_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });
      
    if (error) {
      console.error('Error fetching categories by country ID:', error);
      return [];
    }
    
    // Cache the result
    categoryCache.set(cacheKey, data || []);
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchCategoriesByCountryId:', error);
    return [];
  }
}

// Fetch types by country ID
export async function fetchTypesByCountryId(countryId: string) {
  try {
    const cacheKey = `types-by-country-${countryId}`;
    
    // Check cache first
    if (typeCache.has(cacheKey)) {
      console.log("countryService: Using cached data for", cacheKey);
      return typeCache.get(cacheKey);
    }
    
    const { data, error } = await supabase
      .from('banknote_type_definitions')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });
      
    if (error) {
      console.error('Error fetching types by country ID:', error);
      return [];
    }
    
    // Cache the result
    typeCache.set(cacheKey, data || []);
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchTypesByCountryId:', error);
    return [];
  }
}

// Fetch sort options by country ID
export async function fetchSortOptionsByCountryId(countryId: string) {
  try {
    const cacheKey = `sort-options-by-country-${countryId}`;
    
    // Check cache first
    if (sortOptionCache.has(cacheKey)) {
      console.log("countryService: Using cached data for", cacheKey);
      return sortOptionCache.get(cacheKey);
    }
    
    const { data, error } = await supabase
      .from('banknote_sort_options')
      .select('*')
      .eq('country_id', countryId)
      .order('display_order', { ascending: true });
      
    if (error) {
      console.error('Error fetching sort options by country ID:', error);
      return [];
    }
    
    // Cache the result
    sortOptionCache.set(cacheKey, data || []);
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSortOptionsByCountryId:', error);
    return [];
  }
}

// Fetch user filter preferences
export async function fetchUserFilterPreferences(userId: string, countryId: string) {
  try {
    const cacheKey = `user-preferences-${userId}-${countryId}`;
    
    // Check cache first but only use it briefly
    const cachedData = userPreferencesCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp < 30000)) { // 30 seconds cache
      console.log("countryService: Using cached user preferences");
      return cachedData.data;
    }
    
    console.log(`Fetching filter preferences for user ${userId} and country ${countryId}`);
    
    const { data, error } = await supabase
      .from('user_filter_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found
        console.log(`No preferences found for user ${userId} and country ${countryId}`);
        return null;
      }
      console.error('Error fetching user filter preferences:', error);
      return null;
    }
    
    // Cache the result with timestamp
    userPreferencesCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error in fetchUserFilterPreferences:', error);
    return null;
  }
}

// Save user filter preferences
export async function saveUserFilterPreferences(
  userId: string,
  countryId: string,
  selectedCategories: string[],
  selectedTypes: string[],
  selectedSortOptions: string[]
) {
  try {
    console.log(`Saving filter preferences for user ${userId} and country ${countryId}`);
    
    // First, check if preferences already exist
    const { data: existingPrefs } = await supabase
      .from('user_filter_preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('country_id', countryId)
      .maybeSingle();
      
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
      // Insert new preferences
      result = await supabase
        .from('user_filter_preferences')
        .insert({
          user_id: userId,
          country_id: countryId,
          selected_categories: selectedCategories,
          selected_types: selectedTypes,
          selected_sort_options: selectedSortOptions
        });
    }
    
    const { error } = result;
    
    if (error) {
      console.error('Error saving user filter preferences:', error);
      return false;
    }
    
    // Invalidate cache
    const cacheKey = `user-preferences-${userId}-${countryId}`;
    userPreferencesCache.delete(cacheKey);
    
    return true;
  } catch (error) {
    console.error('Error in saveUserFilterPreferences:', error);
    return false;
  }
}
