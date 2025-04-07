
import { CollectionItem } from './index';
import { User } from './user';

export interface MarketplaceItem {
  id: string;
  collectionItemId: string;
  sellerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Extended properties for UI convenience
  collectionItem?: CollectionItem & {
    banknote?: any;
    personalImages?: string[];
  };
  seller?: User;
}
