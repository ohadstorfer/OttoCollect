
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { 
  saveUserFilterPreferences, 
  fetchUserFilterPreferences 
} from "@/services/countryService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Create marketplace preferences key constant to avoid typos
const MARKETPLACE_PREFERENCES_KEY = 'marketplace-filters';

interface BanknoteFilterMarketplaceProps {
  onFilterChange: (filters: Partial<DynamicFilterState>) => void;
  currentFilters: DynamicFilterState;
  isLoading?: boolean;
  className?: string;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
}

export const BanknoteFilterMarketplace: React.FC<BanknoteFilterMarketplaceProps> = ({
  onFilterChange,
  currentFilters,
  isLoading = false,
  className,
  onViewModeChange,
  viewMode = 'grid'
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [types, setTypes] = useState<FilterOption[]>([]);
  const [sortOptions, setSortOptions] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFilterOptions = async () => {
      setLoading(true);
      
      try {
        // Get all categories and types
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('banknote_category_definitions')
          .select('*')
          .order('display_order');
          
        if (categoriesError) throw categoriesError;

        const { data: typesData, error: typesError } = await supabase
          .from('banknote_type_definitions')
          .select('*')
          .order('display_order');
          
        if (typesError) throw typesError;
        
        // Map the data to FilterOption format
        const mappedCategories = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
        }));
        
        const mappedTypes = typesData.map(type => ({
          id: type.id,
          name: type.name,
        }));
        
        // Create fixed sort options for marketplace
        const sortOptions = [
          {
            id: "faceValue",
            name: "Face Value",
            fieldName: "faceValue",
            isRequired: false
          },
          {
            id: "extPick",
            name: "Extended Pick",
            fieldName: "extPick",
            isRequired: true
          },
          {
            id: "country",
            name: "Country",
            fieldName: "country",
            isRequired: false
          }
        ];
        
        setCategories(mappedCategories);
        setTypes(mappedTypes);
        setSortOptions(sortOptions);
        
        // Load user preferences from localStorage instead of database for marketplace
        if (user) {
          try {
            // Get user preferences from localStorage to avoid UUID issues
            const savedPreferencesStr = localStorage.getItem(`${MARKETPLACE_PREFERENCES_KEY}-${user.id}`);
            let userPreferences = null;
            
            if (savedPreferencesStr) {
              try {
                userPreferences = JSON.parse(savedPreferencesStr);
                console.log("Loaded marketplace preferences from localStorage:", userPreferences);
              } catch (err) {
                console.error("Error parsing saved preferences:", err);
              }
            }
            
            if (userPreferences) {
              onFilterChange({
                search: userPreferences.search || "",
                categories: userPreferences.categories || [],
                types: userPreferences.types || [],
                sort: userPreferences.sort || ['extPick']
              });
            } else {
              // Set default filters if no user preferences are found
              onFilterChange({
                categories: mappedCategories.map(cat => cat.id),
                types: mappedTypes
                  .filter(type => type.name.toLowerCase().includes('issued'))
                  .map(t => t.id),
                sort: ['extPick']
              });
            }
          } catch (err) {
            console.error("Error handling user preferences:", err);
            // Use defaults on error
            onFilterChange({
              categories: mappedCategories.map(cat => cat.id),
              types: mappedTypes
                .filter(type => type.name.toLowerCase().includes('issued'))
                .map(t => t.id),
              sort: ['extPick']
            });
          }
        }
      } catch (error) {
        console.error("Error loading filter options:", error);
        toast({
          title: "Error",
          description: "Failed to load filter options.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [user, onFilterChange, toast]);

  const handleFilterChange = (newFilters: Partial<DynamicFilterState>) => {
    if (newFilters.sort) {
      // Ensure extPick is always included
      if (!newFilters.sort.includes('extPick')) {
        newFilters.sort = [...newFilters.sort, 'extPick'];
      }
    }
    
    // Save user preferences to localStorage instead of database
    if (user?.id) {
      console.log("Auto-saving marketplace filter preferences to localStorage");
      localStorage.setItem(
        `${MARKETPLACE_PREFERENCES_KEY}-${user.id}`, 
        JSON.stringify({
          search: newFilters.search || currentFilters.search,
          categories: newFilters.categories || currentFilters.categories,
          types: newFilters.types || currentFilters.types,
          sort: newFilters.sort || currentFilters.sort
        })
      );
    }
    
    onFilterChange(newFilters);
  };

  return (
    <div className={cn(
      "w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 p-1.5",
      "sticky top-16 inset-x-0",
      className
    )}>
      <BaseBanknoteFilter
        categories={categories}
        types={types}
        sortOptions={sortOptions}
        onFilterChange={handleFilterChange}
        currentFilters={currentFilters}
        isLoading={isLoading || loading}
        className={className}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
    </div>
  );
};
