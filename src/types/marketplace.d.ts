
import { CollectionItem } from './collection';

export interface MarketplaceItem {
  id: string;
  banknoteId: string;
  collectionItemId: string;
  sellerId: string;
  status: 'Available' | 'Sold' | 'Reserved';
  createdAt: string;
  updatedAt: string;
  
  // Joined fields
  collectionItem?: CollectionItem;
  sellerUsername?: string;
  sellerAvatarUrl?: string;
}
