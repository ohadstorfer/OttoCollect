// Add this to your DetailedBanknote interface or extend it
export interface DetailedBanknote {
  id: string;
  country: string;
  denomination: string;
  imageUrls?: string[];
  year?: string;
  pickNumber?: string;
  extendedPickNumber?: string;
  extended_pick_number?: string; // Legacy property
  turkCatalogNumber?: string;
  rarity?: string;
  sultanName?: string;
  sealNames?: string;
  category?: string;
  type?: string;
  catalogId?: string;
  isPending?: boolean;
  isApproved?: boolean;
  faceValue?: string;
  face_value?: string; // Legacy property
  createdAt?: string;
  created_at?: string; // Legacy property
  // ... other properties
}
