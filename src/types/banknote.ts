
// Basic type for image URLs - can be a string or array of strings
export type ImageUrls = string | string[];

// Type for banknote categories
export interface BanknoteCategory {
  id: string;
  name: string;
  description?: string;
}

// Type for banknote types
export interface BanknoteType {
  id: string;
  name: string;
  description?: string;
}

// Type for sort options
export interface SortOption {
  id: string;
  name: string;
  fieldName: string;
}
