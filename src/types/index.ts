
export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: Banknote;
  condition: BanknoteCondition;
  salePrice: number | null;
  isForSale: boolean;
  publicNote?: string;
  privateNote?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}
