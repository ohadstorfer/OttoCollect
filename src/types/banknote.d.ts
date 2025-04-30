
export interface Currency {
  id: string;
  name: string;
  country_id: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

// Add an explicit definition for string or string[] type for imageUrls
export type ImageUrls = string | string[];

// Update the Banknote interface to use ImageUrls type
export interface Banknote {
  id: string;
  catalogId: string;
  country: string;
  denomination: string;
  year: string;
  series?: string;
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  imageUrls: ImageUrls;  // This can be string or string[]
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  type?: string;
  sultanName?: string;
  extendedPickNumber?: string;
  category?: string;
}
