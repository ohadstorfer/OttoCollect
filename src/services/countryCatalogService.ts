
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

// Add the missing function that's being imported in Catalog.tsx
export async function fetchCountriesForCatalog(): Promise<CountryData[]> {
  // For now, this is just an alias for fetchAllCountries
  // We can enhance this later if needed to include additional data like banknote counts
  const countries = await fetchAllCountries();
  
  // Add banknote count property to each country
  // This is a placeholder - in a real implementation, you would fetch this data from the database
  return countries.map(country => ({
    ...country,
    banknoteCount: 0 // Placeholder value
  }));
}
