
import React from 'react';
import CollectionItemForm from './CollectionItemForm';
import type { CollectionItem } from '@/types';

// This component is a simple wrapper around CollectionItemForm
// to ensure consistent editing functionality
interface CollectionItemFormEditProps {
  collectionItem: CollectionItem;
  onUpdate?: (item: CollectionItem) => void;
  onCancel?: () => void;
}

const CollectionItemFormEdit: React.FC<CollectionItemFormEditProps> = ({
  collectionItem,
  onUpdate,
  onCancel
}) => {
  return (
    <CollectionItemForm 
      collectionItem={collectionItem}
      onUpdate={onUpdate}
      onCancel={onCancel}
      isNewItem={false} // Explicitly mark as not a new item
    />
  );
};

export default CollectionItemFormEdit;
