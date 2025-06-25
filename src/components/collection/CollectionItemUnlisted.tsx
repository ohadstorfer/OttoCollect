import React from 'react';
import EditUnlistedBanknoteDialog from './EditUnlistedBanknoteDialog';
import { CollectionItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface CollectionItemUnlistedProps {
  collectionItem: CollectionItem;
  isOwner: boolean;
  onUpdate: () => Promise<void>;
}

export default function CollectionItemUnlisted({
  collectionItem,
  isOwner,
  onUpdate
}: CollectionItemUnlistedProps) {
  const { user } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  return (
    <>
      {isOwner && (
        <EditUnlistedBanknoteDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          onUpdate={onUpdate}
          collectionItem={collectionItem}
        />
      )}
    </>
  );
}
