import EditUnlistedBanknoteDialog from './EditUnlistedBanknoteDialog';

export default function CollectionItemUnlisted({ collectionItem, isOwner, onUpdate }: CollectionItemCardProps) {
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