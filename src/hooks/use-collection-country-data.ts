
import { useState, useEffect, useCallback } from "react";
import { NavigateFunction } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchUserCollectionItems, fetchBanknoteCategoriesAndTypes } from "@/services/collectionService";
import { CollectionItem } from "@/types";
import { fetchCountriesForCatalog } from "@/services/countryCatalogService";

interface UseCollectionCountryDataProps {
  userId?: string;
  countryName: string;
  navigate: NavigateFunction;
}

export const useCollectionCountryData = ({ 
  userId, 
  countryName,
  navigate 
}: UseCollectionCountryDataProps) => {
  const { user } = useAuth();
  const [countryId, setCountryId] = useState<string>("");
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState(false);

  // Find country ID from name
  useEffect(() => {
    const fetchCountryId = async () => {
      try {
        if (!countryName) {
          console.warn("No country name provided");
          return;
        }

        console.log("Fetching country ID for:", countryName);
        // Fetch all countries and find the matching one by name
        const countries = await fetchCountriesForCatalog();
        const country = countries.find(
          c => c.name.toLowerCase() === decodeURIComponent(countryName).toLowerCase()
        );
        
        if (!country) {
          console.error("Country not found:", countryName);
          navigate("/collection");
          return;
        }
        
        setCountryId(country.id);
      } catch (error) {
        console.error("Error fetching country:", error);
      }
    };

    fetchCountryId();
  }, [countryName, navigate]);
  
  // Fetch collection items for this user and country
  useEffect(() => {
    const fetchCollectionData = async () => {
      try {
        if (!countryId) return;
        
        setLoading(true);
        const collectionUserId = userId || user?.id;
        
        if (!collectionUserId) {
          console.error("No user ID available");
          return;
        }
        
        console.log(`Fetching collection items for user ${collectionUserId} and country ID ${countryId}`);
        
        // Fetch all collection items for the user
        const allItems = await fetchUserCollectionItems(collectionUserId);
        
        // Filter items by country
        const filteredItems = allItems.filter(item => 
          item.banknote && item.banknote.country === decodeURIComponent(countryName)
        );
        
        console.log(`Found ${filteredItems.length} items for country ${countryName}`);
        
        setCollectionItems(filteredItems);
        
        // Extract categories and types from the filtered items
        const { categories: extractedCategories, types: extractedTypes } = 
          await fetchBanknoteCategoriesAndTypes(filteredItems);
        
        setCategories(extractedCategories);
        setTypes(extractedTypes);
      } catch (error) {
        console.error("Error fetching collection data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCollectionData();
  }, [countryId, userId, user?.id, countryName]);
  
  // Load user preferences from session storage
  useEffect(() => {
    if (!user?.id) return;
    
    try {
      const storedGroupMode = sessionStorage.getItem(`collectionGroupMode-${user.id}`);
      if (storedGroupMode) {
        setGroupMode(JSON.parse(storedGroupMode));
      }
    } catch (e) {
      console.error("Error loading group mode preference:", e);
    }
  }, [user?.id]);
  
  const handleGroupModeChange = useCallback((mode: boolean) => {
    setGroupMode(mode);
    
    // Save preference
    if (user?.id) {
      try {
        sessionStorage.setItem(`collectionGroupMode-${user.id}`, JSON.stringify(mode));
      } catch (e) {
        console.error("Unable to store group mode preference:", e);
      }
    }
  }, [user?.id]);

  return {
    countryId,
    collectionItems,
    categories,
    types,
    loading,
    groupMode,
    handleGroupModeChange
  };
};
