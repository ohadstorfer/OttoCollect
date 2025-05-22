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
import { BanknoteImage } from '@/components/banknote/BanknoteImage';

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

  const isUnlisted = collectionItem.is_unlisted_banknote;

  return (
    <div className="p-6">
      

      {/* Banknote Details Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Public Details</h3>
          <div className="space-y-2">
            {collectionItem.banknote?.denomination && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Denomination</span>
                <span className="text-base">{collectionItem.banknote.denomination}</span>
              </div>
            )}
            {collectionItem.banknote?.country && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Country</span>
                <span className="text-base">{collectionItem.banknote.country}</span>
              </div>
            )}
            {collectionItem.banknote?.year && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Year</span>
                <span className="text-base">{collectionItem.banknote.year}</span>
              </div>
            )}
            {collectionItem.banknote?.series && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Series</span>
                <span className="text-base">{collectionItem.banknote.series}</span>
              </div>
            )}
            {isUnlisted && collectionItem.banknote?.name && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Name</span>
                <span className="text-base">{collectionItem.banknote.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Collection Item Details */}
        <div>
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
            {collectionItem.isForSale && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">For Sale</span>
                <span className="text-base">${collectionItem.salePrice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Private Details Section - Only visible to owner */}
        {isOwner && (
          <div>
            <div className="w-full h-px bg-muted my-6" />
            <div className="flex items-center gap-2 mb-4">
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
      </div>
    </div>
  );
};

export default BanknoteCollectionDetail;
