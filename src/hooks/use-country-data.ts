
import { useState, useEffect, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { fetchCountryByName, fetchCategoriesByCountryId, fetchUserFilterPreferences } from "@/services/countryService";
import { supabase } from "@/integrations/supabase/client";
import { CategoryDefinition, CountryData } from "@/types/filter";
import { Currency } from "@/types/banknote";

interface UseCountryDataProps {
  countryName: string;
  navigate: (path: string) => void;
}

interface UseCountryDataResult {
  countryId: string;
  countryData: CountryData | null;
  categoryOrder: { name: string; order: number }[];
  currencies: Currency[];
  loading: boolean;
  groupMode: boolean;
  hasLoadedPreferences: React.MutableRefObject<boolean>;
  setGroupMode: (mode: boolean) => void;
  handleGroupModeChange: (mode: boolean) => void;
}

export const useCountryData = ({ 
  countryName, 
  navigate 
}: UseCountryDataProps): UseCountryDataResult => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [countryId, setCountryId] = useState<string>("");
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [categoryOrder, setCategoryOrder] = useState<{ name: string; order: number }[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [groupMode, setGroupMode] = useState<boolean>(false);
  
  // Add refs to track states and prevent render loops
  const hasLoadedPreferences = useRef<boolean>(false);
  const isGroupModeChanging = useRef<boolean>(false);
  const initialLoadComplete = useRef<boolean>(false);
  
  useEffect(() => {
    const loadCountryData = async () => {
      if (!countryName) {
        console.log("CountryDetail: No country name provided");
        return;
      }

      try {
        // Make sure we're using the decoded country name
        const decodedCountryName = decodeURIComponent(countryName);
        console.log("CountryDetail: Loading country data for", decodedCountryName);

        const countryData = await fetchCountryByName(decodedCountryName);

        if (!countryData) {
          console.error("CountryDetail: Country not found:", decodedCountryName);
          toast({
            title: "Error",
            description: `Country "${decodedCountryName}" not found.`,
            variant: "destructive",
          });
          navigate('/catalog');
          return;
        }

        console.log("CountryDetail: Country data loaded", countryData);
        setCountryId(countryData.id);
        setCountryData(countryData);

        const categories = await fetchCategoriesByCountryId(countryData.id);
        console.log("CountryDetail: Raw categories from database:", categories);
        
        const orderMap = categories.map((cat: CategoryDefinition) => ({
          name: cat.name,
          name_ar: cat.name_ar,
          name_tr: cat.name_tr,
          order: cat.display_order
        }));
        console.log("CountryDetail: Mapped category order:", orderMap);
        setCategoryOrder(orderMap);

        const { data: currencyRows, error: currencyError } = await supabase
          .from("currencies")
          .select("id, name, display_order, country_id")
          .eq("country_id", countryData.id)
          .order("display_order", { ascending: true });

        if (currencyError) {
          console.error("Error fetching currencies:", currencyError);
          setCurrencies([]);
        } else if (currencyRows) {
          setCurrencies(currencyRows as Currency[]);
          console.log("Loaded currencies:", currencyRows);
        }

        // Try to load group mode from user preferences - but only if we haven't loaded it already
        if (user?.id && !hasLoadedPreferences.current && !initialLoadComplete.current) {
          try {
            const preferences = await fetchUserFilterPreferences(user.id, countryData.id);
            if (preferences && typeof preferences.group_mode === 'boolean') {
              console.log("CountryDetail: Loaded group mode from preferences:", preferences.group_mode);
              setGroupMode(preferences.group_mode);
              hasLoadedPreferences.current = true;
            }
          } catch (err) {
            console.error("Error loading group mode from preferences:", err);
          }
        } else if (!user && !hasLoadedPreferences.current && !initialLoadComplete.current) {
          // If no user is logged in, try to load from session storage
          try {
            const savedMode = sessionStorage.getItem(`groupMode-${countryData.id}`);
            if (savedMode !== null) {
              const parsedMode = JSON.parse(savedMode);
              console.log("CountryDetail: Loaded group mode from session storage:", parsedMode);
              setGroupMode(parsedMode);
              hasLoadedPreferences.current = true;
            }
          } catch (err) {
            console.error("Error loading group mode from session storage:", err);
          }
        }
        
        initialLoadComplete.current = true;
        setLoading(false);
      } catch (error) {
        console.error("CountryDetail: Error loading country data:", error);
        toast({
          title: "Error",
          description: "Failed to load country data. Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadCountryData();
  }, [countryName, navigate, toast, user]); // Removed onGroupModeChange from dependencies

  // Debug: Track when groupMode actually changes
  useEffect(() => {
    console.log("useCountryData: groupMode state changed to:", groupMode);
  }, [groupMode]);

  const handleGroupModeChange = useCallback((mode: boolean) => {
    console.log("useCountryData: handleGroupModeChange called with mode:", mode, "current groupMode:", groupMode);
    
    // Update state immediately with flushSync
    flushSync(() => {
      setGroupMode(mode);
    });
    console.log("useCountryData: setGroupMode called with flushSync:", mode);
    
    // Store in session storage as a fallback for non-logged in users
    if (!user) {
      try {
        sessionStorage.setItem(`groupMode-${countryId}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store group mode in session storage:", e);
      }
    }
    
    // Notify any subscribers that the mode has changed
    window.dispatchEvent(new CustomEvent('groupModeChange', { detail: { mode } }));
  }, [countryId, user]);

  return {
    countryId,
    countryData,
    categoryOrder,
    currencies,
    loading,
    groupMode,
    hasLoadedPreferences,
    setGroupMode,
    handleGroupModeChange
  };
};
