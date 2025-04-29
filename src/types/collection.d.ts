
import { CollectionItem } from './index';

export interface CollectionItemCardProps {
  item: CollectionItem;
  isPublicView?: boolean;
  onItemEdit: (item: CollectionItem) => void;
  onCollectionUpdated: () => Promise<void>;
}
