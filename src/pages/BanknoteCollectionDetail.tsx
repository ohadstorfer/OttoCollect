
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  return (
    <div className="p-6">
      {/* Banknote Details Section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Public Details</h3>
          <div className="space-y-2">
            {collectionItem.banknote?.extendedPickNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Extended Pick Number</span>
                <span className="text-base">{collectionItem.banknote.extendedPickNumber}</span>
              </div>
            )}
            {collectionItem.banknote?.pickNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Pick Number</span>
                <span className="text-base">{collectionItem.banknote.pickNumber} </span>
              </div>
            )}
            {collectionItem.banknote?.turkCatalogNumber && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Turk Catalog Number</span>
                <span className="text-base">{collectionItem.banknote.turkCatalogNumber}</span>
              </div>
            )}
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
            {collectionItem.banknote?.category && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Category</span>
                <span className="text-base">{collectionItem.banknote.category}</span>
              </div>
            )}
            {collectionItem.banknote?.sultanName && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Sultan Name</span>
                <span className="text-base">{collectionItem.banknote.sultanName}</span>
              </div>
            )}
            {collectionItem.banknote?.type && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Type</span>
                <span className="text-base">{collectionItem.banknote.type}</span>
              </div>
            )}
            {collectionItem.banknote?.serialNumbering && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Prefix Range</span>
                <span className="text-base">{collectionItem.banknote.serialNumbering}</span>
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
        <div className="w-full h-px bg-muted my-6" />

        {/* Collection Item Details */}
        <div>
          <div className="space-y-2">
            {collectionItem.condition && !collectionItem.grade && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Condition</span>
                <span className="text-base">{collectionItem.condition}</span>
              </div>
            )}
            {collectionItem.grade && (
              <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
                <span className="text-sm font-medium text-muted-foreground w-32">Grading</span>
                <span className="text-base">
                  {collectionItem.grade_by && `${collectionItem.grade_by} `}{collectionItem.grade}{collectionItem.grade_condition_description && ` - ${collectionItem.grade_condition_description}`}
                </span>
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
        <div className="w-full h-px bg-muted my-6" />

        <div className="space-y-2">
          {collectionItem.banknote?.islamicYear && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Islamic Year</span>
              <span className="text-base">{collectionItem.banknote.islamicYear}</span>
            </div>
          )}
          {collectionItem.banknote?.gregorianYear && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Gregorian Year</span>
              <span className="text-base">{collectionItem.banknote.gregorianYear}</span>
            </div>
          )}
          {collectionItem.banknote?.description && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Description</span>
              <span className="text-base">{collectionItem.banknote.description}</span>
            </div>
          )}
          {collectionItem.banknote?.securityElement && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-base">{collectionItem.banknote.securityElement}</span>
            </div>
          )}
          {collectionItem.banknote?.sealNames && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Seal Names</span>
              <span className="text-base">{collectionItem.banknote.sealNames}</span>
            </div>
          )}
          {collectionItem.banknote?.signaturesFront && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Front Signatures</span>
              <span className="text-base">{collectionItem.banknote.signaturesFront}</span>
            </div>
          )}

          {collectionItem.banknote?.signaturesBack && (
            <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
              <span className="text-sm font-medium text-muted-foreground w-32">Back Signatures</span>
              <span className="text-base">{collectionItem.banknote.signaturesBack}</span>
            </div>
          )}

          {/* Signature Pictures */}
          {collectionItem.banknote?.signaturePictureUrls && collectionItem.banknote.signaturePictureUrls.length > 0 && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Signature Pictures</span>
              <div className="flex flex-wrap gap-2">
                {collectionItem.banknote.signaturePictureUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Signature ${index + 1}`}
                    className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                    onClick={() => openImageViewer(url)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Seal Pictures */}
          {collectionItem.banknote?.sealPictureUrls && collectionItem.banknote.sealPictureUrls.length > 0 && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Seal Pictures</span>
              <div className="flex flex-wrap gap-2">
                {collectionItem.banknote.sealPictureUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Seal ${index + 1}`}
                    className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                    onClick={() => openImageViewer(url)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Watermark Picture - using the new resolved URL */}
          {collectionItem.banknote?.watermarkUrl && (
            <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
              <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Watermark</span>
              <img
                src={collectionItem.banknote.watermarkUrl}
                alt="Watermark"
                className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => openImageViewer(collectionItem.banknote.watermarkUrl!)}
              />
            </div>
          )}
        </div>

        {/* Private Details Section - Only visible to owner */}
        <div className="w-full h-px bg-muted my-6" />
        {isOwner && (
          <div>
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

      {selectedImage && (
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContentWithScroll className="sm:max-w-[800px] p-1">
          <img
            src={selectedImage}
            alt="Banknote detail"
            className="w-full h-auto rounded"
          />
        </DialogContentWithScroll>
      </Dialog>
    )}

    </div>
  );
};

export default BanknoteCollectionDetail;
