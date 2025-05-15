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
import { useToast } from '@/hooks/use-toast';

interface BanknoteCollectionDetailProps {
  isOwner: boolean;
}

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ isOwner }) => {
  const { id } = useParams<{ id: string }>();
  const { banknoteId } = useBanknoteContext();
  const { toast } = useToast();

  // Determine which ID to use
  const itemId = id || banknoteId;

  // Fetch collection item data
  const { data: collectionItem, isLoading, refetch } = useQuery({
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

  return (
    <div className="p-6">


        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-medium ">Details</h3>
        </div>

        <div className="space-y-2">
          {collectionItem.condition && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Condition</span>
              <span className="text-base">{collectionItem.condition}</span>
            </div>
          )}

          {collectionItem.publicNote && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Notes</span>
              <span className="text-base">{collectionItem.publicNote}</span>
            </div>
          )}
        </div>

        {isOwner && (
          
          <div>
            
            <div className="w-full h-px bg-muted my-6" />

            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-medium">Private Details</h3>
              <span className="text-sm text-muted-foreground">Only visible to you</span>
            </div>
            <div className="space-y-2">
              {collectionItem.privateNote && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">Private Notes</span>
                  <span className="text-base">{collectionItem.privateNote}</span>
                </div>
              )}
              {collectionItem.location && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">Storage Location</span>
                  <span className="text-base">{collectionItem.location}</span>
                </div>
              )}
              {collectionItem.purchasePrice && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">Purchase Price</span>
                  <span className="text-base">${collectionItem.purchasePrice}</span>
                </div>
              )}
              {collectionItem.purchaseDate && (
                <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                  <span className="text-sm font-medium text-muted-foreground w-32">Purchase Date</span>
                  <span className="text-base">{formatDate(collectionItem.purchaseDate)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other sections as needed */}



    </div>
  );
};

export default BanknoteCollectionDetail;
