
export type BanknoteCondition = 'UNC' | 'AU' | 'XF' | 'VF' | 'F' | 'VG' | 'G' | 'Fair' | 'Poor';

export interface Banknote {
  id: string;
  catalogId?: string;
  country: string;
  denomination: string;
  year: string;
  series?: string;
  description?: string;
  obverseDescription?: string;
  reverseDescription?: string;
  imageUrls: string[];
  isApproved: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  type?: string;
  sultanName?: string;
  extendedPickNumber?: string;
  category?: string; // Added this property
}
