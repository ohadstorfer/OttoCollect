
import { Banknote, BanknoteCondition } from './banknote';

export interface CollectionItem {
  id: string;
  userId: string;
  banknoteId: string;
  banknote: Banknote;
  condition: BanknoteCondition;
  purchasePrice?: number;
  purchaseDate?: string;
  location?: string;
  obverseImage?: string;
  reverseImage?: string;
  personalImages?: string[];
  publicNote?: string;
  privateNote?: string;
  isForSale: boolean;
  salePrice?: number;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionItemCardProps {
  collectionItem: CollectionItem;
  onItemEdit: () => void;
  onCollectionUpdated: () => Promise<void>;
  isPublicView?: boolean;
}

export interface CollectionItemFormProps {
  initialItem: CollectionItem | null;
  onSave: (item: CollectionItem) => Promise<void>;
  onCancel: () => void;
}

export interface CollectionImageUploadProps {
  collectionItem: CollectionItem;
  onUpdate: () => void;
}

export interface EditCollectionImagesProps {
  collectionItem: CollectionItem;
  onUpdate: () => void;
  onClose: () => void;
}
