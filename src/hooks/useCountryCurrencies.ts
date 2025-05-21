
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCountryCurrencies(countryName?: string) {
  const [currencies, setCurrencies] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!countryName) return;
      setLoading(true);
      // Get country id
      const { data: country, error } = await supabase
        .from("countries")
        .select("id")
        .eq("name", countryName)
        .maybeSingle();
      if (error || !country) {
        setLoading(false);
        setCurrencies([]);
        return;
      }
      // Fetch currencies for country id
      const { data, error: err2 } = await supabase
        .from("currencies")
        .select("id,name")
        .eq("country_id", country.id)
        .order("display_order", { ascending: true });
      setCurrencies(err2 || !data ? [] : data);
      setLoading(false);
    };
    fetchCurrencies();
  }, [countryName]);

  return { currencies, loading };
}
