
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCountryTypeDefs(countryName?: string) {
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTypeDefs = async () => {
      if (!countryName) return;
      setLoading(true);
      // Get country id
      const { data: country, error } = await supabase
        .from("countries")
        .select("id")
        .eq("name", countryName)
        .maybeSingle();
      if (error || !country) {
        setTypes([]);
        setLoading(false);
        return;
      }
      // Fetch type defs for this country id
      const { data, error: err2 } = await supabase
        .from("banknote_type_definitions")
        .select("id,name")
        .eq("country_id", country.id)
        .order("display_order", { ascending: true });
      setTypes(err2 || !data ? [] : data);
      setLoading(false);
    };
    fetchTypeDefs();
  }, [countryName]);

  return { types, loading };
}
