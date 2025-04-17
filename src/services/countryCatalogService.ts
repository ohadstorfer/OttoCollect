
import { supabase } from "@/integrations/supabase/client";
import { CountryData } from "@/types";

export async function fetchAllCountries(): Promise<CountryData[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching countries:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in fetchAllCountries:", error);
    return [];
  }
}

export async function fetchCountryById(id: string): Promise<CountryData | null> {
  try {
    if (!id) return null;
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error("Error fetching country by ID:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchCountryById:", error);
    return null;
  }
}

// Implement the missing function that's being imported in Catalog.tsx
export async function fetchCountriesForCatalog(): Promise<CountryData[]> {
  try {
    const countries = await fetchAllCountries();
    
    // For each country, get the banknote count
    const countriesWithCounts = await Promise.all(
      countries.map(async (country) => {
        // First, get the country name
        const countryName = country.name;
        
        // Then get count of banknotes with this country name
        const { count, error } = await supabase
          .from('detailed_banknotes')
          .select('*', { count: 'exact', head: true })
          .eq('country', countryName);
        
        if (error) {
          console.error(`Error counting banknotes for country ${countryName}:`, error);
          return {
            ...country,
            banknoteCount: 0
          };
        }
        
        return {
          ...country,
          banknoteCount: count || 0
        };
      })
    );
    
    return countriesWithCounts;
  } catch (error) {
    console.error("Error in fetchCountriesForCatalog:", error);
    return [];
  }
}
