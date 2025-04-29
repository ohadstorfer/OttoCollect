
import { Banknote } from './banknote';

export interface WishlistItem {
  id: string;
  banknoteId: string;
  banknote: Banknote;
  userId: string;
  priority: 'Low' | 'Medium' | 'High';
  note?: string;
  createdAt: string;
}

export interface WishlistItemFormData {
  banknoteId: string;
  priority: 'Low' | 'Medium' | 'High';
  note?: string;
}
