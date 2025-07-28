import React, { useState } from 'react';
import EditUnlistedBanknoteDialog from './EditUnlistedBanknoteDialog';
import { CollectionItem } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContentWithScroll } from '@/components/ui/dialog';

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  if (!collectionItem.is_unlisted_banknote || !collectionItem.banknote) {
    return null;
  }

  const unlistedBanknote = collectionItem.banknote;

  return (
    <>
      <div className="space-y-6">
        {/* Dimensions */}
        {unlistedBanknote.dimensions && (
          <div className="flex items-center gap-x-2 border-b border-gray-100 py-1">
            <span className="text-sm font-medium text-muted-foreground w-32">Dimensions</span>
            <span className="text-base">{unlistedBanknote.dimensions}</span>
          </div>
        )}

        {/* Signatures Front Pictures */}
        {unlistedBanknote.signaturesFrontUrls && unlistedBanknote.signaturesFrontUrls.length > 0 && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Front Signature Pictures</span>
            <div className="flex flex-wrap gap-2">
              {unlistedBanknote.signaturesFrontUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Front Signature ${index + 1}`}
                  className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() => openImageViewer(url)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Signatures Back Pictures */}
        {unlistedBanknote.signaturesBackUrls && unlistedBanknote.signaturesBackUrls.length > 0 && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Back Signature Pictures</span>
            <div className="flex flex-wrap gap-2">
              {unlistedBanknote.signaturesBackUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Back Signature ${index + 1}`}
                  className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() => openImageViewer(url)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Seal Pictures */}
        {unlistedBanknote.sealPictureUrls && unlistedBanknote.sealPictureUrls.length > 0 && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Seal Pictures</span>
            <div className="flex flex-wrap gap-2">
              {unlistedBanknote.sealPictureUrls.map((url, index) => (
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

        {/* Watermark Picture */}
        {unlistedBanknote.watermarkUrl && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Watermark Picture</span>
            <img
              src={unlistedBanknote.watermarkUrl}
              alt="Watermark"
              className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
              onClick={() => openImageViewer(unlistedBanknote.watermarkUrl!)}
            />
          </div>
        )}

        {/* Tughra Picture */}
        {unlistedBanknote.tughraUrl && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Tughra Picture</span>
            <img
              src={unlistedBanknote.tughraUrl}
              alt="Tughra"
              className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
              onClick={() => openImageViewer(unlistedBanknote.tughraUrl!)}
            />
          </div>
        )}

        {/* Other Element Pictures */}
        {unlistedBanknote.otherElementPictures && unlistedBanknote.otherElementPictures.length > 0 && (
          <div className="flex items-start gap-x-2 border-b border-gray-100 py-3">
            <span className="text-sm font-medium text-muted-foreground w-32 mt-1">Other Pictures</span>
            <div className="flex flex-wrap gap-2">
              {unlistedBanknote.otherElementPictures.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Other Element ${index + 1}`}
                  className="rounded-lg max-h-20 object-contain border border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() => openImageViewer(url)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContentWithScroll className="max-w-4xl">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size view"
              className="w-full h-auto object-contain"
            />
          )}
        </DialogContentWithScroll>
      </Dialog>

      {/* Edit Dialog */}
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
