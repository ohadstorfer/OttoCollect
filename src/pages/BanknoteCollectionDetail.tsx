import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCollectionItem } from '@/services/collectionService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabelValuePair } from "@/components/ui/label-value-pair";
import { useBanknoteContext } from '@/context/BanknoteContext';
import { CollectionItem } from '@/types';

interface BanknoteCollectionDetailProps {
  isOwner: boolean;
}

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ isOwner }) => {
  const { id } = useParams<{ id: string }>();
  const { banknoteId } = useBanknoteContext();

  // Determine which ID to use
  const itemId = id || banknoteId;

  // Fetch collection item data
  const { data: collectionItem, isLoading } = useQuery({
    queryKey: ["collectionItem", itemId],
    queryFn: () => fetchCollectionItem(itemId || ""),
    enabled: !!itemId,
  });

  if (isLoading || !collectionItem) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-center">Loading collection details...</p>
      </div>
    );
  }

  // Helper function to format dates to strings
  const formatDate = (date: string | Date | undefined): string | undefined => {
    if (!date) return undefined;
    return typeof date === 'string' ? date : date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Condition Information</h3>
          <div className="space-y-2">
            <LabelValuePair
              label="Condition"
              value={collectionItem.condition}
            />
            <LabelValuePair
              label="Grade"
              value={collectionItem.condition} // Use condition as a fallback for grade
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Acquisition Details</h3>
          <div className="space-y-2">
            <LabelValuePair
              label="Purchase Date"
              value={formatDate(collectionItem.purchaseDate)}
            />
            <LabelValuePair
              label="Seller"
              value={collectionItem.location} // Using location as seller info
            />
            <LabelValuePair
              label="Notes"
              value={collectionItem.publicNote}
            />
          </div>
        </div>

        {isOwner && (
          <>
            <div>
              <h3 className="text-lg font-medium mb-2">Private Details</h3>
              <div className="space-y-2">
                <LabelValuePair
                  label="Private Notes"
                  value={collectionItem.privateNote}
                />
                <LabelValuePair
                  label="Storage Location"
                  value={collectionItem.location} // Using location as storage info
                />
                <LabelValuePair
                  label="Purchase Price"
                  value={collectionItem.purchasePrice ? `$${collectionItem.purchasePrice}` : undefined}
                />
              </div>
            </div>
          </>
        )}

        {/* Other sections as needed */}
      </div>
    </div>
  );
};

export default BanknoteCollectionDetail;
