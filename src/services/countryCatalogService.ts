
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
