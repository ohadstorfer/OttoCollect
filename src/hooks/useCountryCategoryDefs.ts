
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCountryCategoryDefs(countryName?: string) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategoryDefs = async () => {
      if (!countryName) return;
      setLoading(true);
      // Get country id
      const { data: country, error } = await supabase
        .from("countries")
        .select("id")
        .eq("name", countryName)
        .maybeSingle();
      if (error || !country) {
        setCategories([]);
        setLoading(false);
        return;
      }
      // Fetch category defs for this country id
      const { data, error: err2 } = await supabase
        .from("banknote_category_definitions")
        .select("id,name")
        .eq("country_id", country.id)
        .order("display_order", { ascending: true });
      setCategories(err2 || !data ? [] : data);
      setLoading(false);
    };
    fetchCategoryDefs();
  }, [countryName]);

  return { categories, loading };
}
