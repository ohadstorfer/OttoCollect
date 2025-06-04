
import React from 'react';
import EditUnlistedBanknoteDialog from './EditUnlistedBanknoteDialog';
import { CollectionItem } from '@/types';

interface CollectionItemUnlistedProps {
  collectionItem: CollectionItem;
  isOwner: boolean;
  onUpdate: () => void;
}

export default function CollectionItemUnlisted({ collectionItem, isOwner, onUpdate }: CollectionItemUnlistedProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  return (
    <>
      <EditUnlistedBanknoteDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={onUpdate}
        collectionItem={collectionItem}
      />
    </>
  );
}
