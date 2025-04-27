
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { BaseBanknoteFilter, FilterOption } from "./BaseBanknoteFilter";
import { DynamicFilterState } from "@/types/filter";
import { 
  fetchCategoriesByCountryId, 
  fetchTypesByCountryId, 
  fetchSortOptionsByCountryId, 
  saveUserFilterPreferences, 
  fetchUserFilterPreferences 
} from "@/services/countryService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
        
        let userPreferences = null;
        if (user) {
          try {
            // Note: You might want to adjust this to store marketplace-specific preferences
            userPreferences = await fetchUserFilterPreferences(user.id, 'marketplace');
          } catch (err) {
            console.error("Error fetching user preferences:", err);
          }
        }
        
        if (userPreferences) {
          onFilterChange({
            categories: userPreferences.selected_categories,
            types: userPreferences.selected_types,
            sort: ['extPick', 'country', 'faceValue']
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
    
    // Save user preferences automatically with each change
    if (user?.id) {
      console.log("Auto-saving filter preferences");
      const sortOptionIds = newFilters.sort?.map(fieldName => {
        const option = sortOptions.find(opt => opt.fieldName === fieldName);
        return option ? option.id : null;
      }).filter(Boolean) as string[];

      saveUserFilterPreferences(
        user.id,
        'marketplace', // Use a special identifier for marketplace preferences
        newFilters.categories || [],
        newFilters.types || [],
        sortOptionIds
      ).catch(error => {
        console.error("Error saving filter preferences:", error);
      });
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
