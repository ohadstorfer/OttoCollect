
export interface Country {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryDefinition {
  id: string;
  country_id: string;
  name: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TypeDefinition {
  id: string;
  country_id: string;
  name: string;
  description?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SortOption {
  id: string;
  country_id: string;
  name: string;
  field_name: string;
  description?: string;
  is_default: boolean;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserFilterPreference {
  id: string;
  user_id: string;
  country_id: string;
  selected_categories: string[];
  selected_types: string[];
  selected_sort_options: string[];
  group_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilterCategoryOption {
  id: string;
  name: string;
  count?: number;
}

export interface DynamicFilterState {
  search: string;
  categories: string[];
  types: string[];
  sort: string[];
  country_id?: string;
  group_mode?: boolean;
}

export interface FilterableItem {
  id: string;
  // Properties used for filtering and display
  banknote?: any; // The actual banknote data
  createdAt?: string | Date;
}

// Define user rank type for TypeScript
export type UserRank = 
  | "Newbie" 
  | "Beginner" 
  | "Collector" 
  | "Advanced" 
  | "Expert" 
  | "Master" 
  | "Grandmaster";
