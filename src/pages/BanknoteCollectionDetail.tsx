import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionItem } from '@/services/collectionService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabelValuePair } from "@/components/ui/label-value-pair";
import { useBanknoteContext } from '@/context/BanknoteContext';
import { CollectionItem } from '@/types';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Dialog, DialogContentWithScroll } from '@/components/ui/dialog';
import CollectionItemForm from '@/components/collection/CollectionItemForm';
import { useToast } from '@/hooks/use-toast';

interface BanknoteCollectionDetailProps {
  isOwner: boolean;
}

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ isOwner }) => {
  const { id } = useParams<{ id: string }>();
  const { banknoteId } = useBanknoteContext();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Determine which ID to use
  const itemId = id || banknoteId;

  // Fetch collection item data
  const { data: collectionItem, isLoading, refetch } = useQuery({
    queryKey: ["collectionItem", itemId],
    queryFn: () => fetchCollectionItem(itemId || ""),
    enabled: !!itemId,
  });

  const handleUpdateSuccess = async () => {
    setIsEditDialogOpen(false);
    toast({
      title: "Success",
      description: "Collection item updated successfully",
    });
    // Refetch the data to get the latest updates
    await refetch();
  };

  if (isLoading || !collectionItem) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-center">Loading collection details...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium mb-2">Details</h3>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <LabelValuePair
            label="Condition"
            value={collectionItem.condition}
          />

          <LabelValuePair
            label="Notes"
            value={collectionItem.publicNote}
          />
        </div>

        {isOwner && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-medium">Private Details</h3>
                <span className="text-sm text-muted-foreground">Only visible to you</span>
              </div>
              <div className="space-y-2">
                <LabelValuePair
                  label="Private Notes"
                  value={collectionItem.privateNote}
                />
                <LabelValuePair
                  label="Storage Location"
                  value={collectionItem.location}
                />
                <LabelValuePair
                  label="Purchase Price"
                  value={collectionItem.purchasePrice ? `$${collectionItem.purchasePrice}` : undefined}
                />
                {collectionItem.purchaseDate && (
                  <LabelValuePair
                    label="Purchase Date"
                    value={formatDate(collectionItem.purchaseDate)}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Other sections as needed */}
      </div>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContentWithScroll className="sm:max-w-[800px]">
          <CollectionItemForm
            collectionItem={collectionItem}
            onUpdate={handleUpdateSuccess}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContentWithScroll>
      </Dialog>
    </div>
  );
};

export default BanknoteCollectionDetail;
