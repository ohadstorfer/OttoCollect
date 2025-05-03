
import { supabase } from "@/integrations/supabase/client";
import { CountryData } from "@/types";

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
