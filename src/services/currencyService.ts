
import { supabase } from "@/integrations/supabase/client";

// Currency object shape
export interface CurrencyDefinition {
  id: string;
  name: string;
  display_order: number;
  country_id: string;
}

export async function fetchCurrenciesForCountry(countryId: string): Promise<CurrencyDefinition[]> {
  if (!countryId) return [];

  const { data, error } = await supabase
    .from("currencies")
    .select("id, name, display_order, country_id")
    .eq("country_id", countryId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error fetching currencies for country:", error);
    return [];
  }
  return data as CurrencyDefinition[];
}
