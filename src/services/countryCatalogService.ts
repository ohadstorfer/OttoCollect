
import { supabase } from "@/integrations/supabase/client";
import { CountryData } from "@/types";

export async function fetchCountriesForCatalog(): Promise<CountryData[]> {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('id, name, description, image_url');
    
    if (error) {
      console.error("Error fetching countries for catalog:", error);
      throw error;
    }
    
    // Get banknote count for each country
    const { data: banknoteData, error: countError } = await supabase
      .from('detailed_banknotes')
      .select('country, id');
    
    if (countError) {
      console.error("Error fetching banknote counts:", countError);
      throw countError;
    }
    
    // Count banknotes per country
    const countMap: Record<string, number> = {};
    banknoteData?.forEach(item => {
      countMap[item.country] = (countMap[item.country] || 0) + 1;
    });
    
    // Combine data
    return data.map(country => ({
      id: country.id,
      name: country.name,
      description: country.description || '',
      imageUrl: country.image_url || null,
      banknoteCount: countMap[country.name] || 0
    }));
  } catch (error) {
    console.error('Error in fetchCountriesForCatalog:', error);
    return [];
  }
}
