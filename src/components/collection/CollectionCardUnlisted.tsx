import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollectionItem, BanknoteCondition } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeFromCollection } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BanknoteImage } from '@/components/banknote/BanknoteImage';
import { formatPrice } from '@/utils/formatters';
import { BANKNOTE_CONDITIONS } from '@/lib/constants';
import { Badge } from '../ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';

// Define conditional props for the component
export interface CollectionItemCardProps {
  item: CollectionItem;
  onEdit?: () => void;
  onUpdate: () => Promise<void>;
  isOwner: boolean;
  viewMode?: 'grid' | 'list';
}

const CollectionCardUnlisted: React.FC<CollectionItemCardProps> = ({
  item,
  onEdit,
  onUpdate,
  isOwner = false,
  viewMode = 'grid'
}) => {
  console.log("CollectionItemCard - isOwner:", isOwner, "for itemId:", item?.id);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Add detailed logging for debugging
  console.log("CollectionItemCard - Rendering with item:", {
    id: item?.id,
    banknoteId: item?.banknoteId,
    banknote: item?.banknote ? {
      id: item.banknote.id,
      country: item.banknote.country || 'Missing country',
      denomination: item.banknote.denomination || 'Missing denomination',
      year: item.banknote.year || 'Missing year',
      series: item.banknote.series || 'Missing series',
      imageUrlsType: item.banknote.imageUrls ? (Array.isArray(item.banknote.imageUrls) ? 'array' : typeof item.banknote.imageUrls) : 'missing'
    } : 'No banknote data'
  });

  // Use custom images if available, otherwise fall back to banknote images
  const displayImage = item?.obverseImage;

  // Use BANKNOTE_CONDITIONS from constants
  const conditionColors: Partial<Record<BanknoteCondition, string>> = {
    'UNC': 'bg-green-100 text-green-800',
    'AU': 'bg-emerald-100 text-emerald-800',
    'XF': 'bg-blue-100 text-blue-800',
    'VF': 'bg-indigo-100 text-indigo-800',
    'F': 'bg-purple-100 text-purple-800',
    'VG': 'bg-amber-100 text-amber-800',
    'G': 'bg-orange-100 text-orange-800',
    'Fair': 'bg-red-100 text-red-800',
    'Poor': 'bg-gray-100 text-gray-800'
  };

  // Helper function to get the banknote title
  function getBanknoteTitle() {
    if (!item?.banknote) {
      console.log("getBanknoteTitle: Missing banknote object");
      return "Unknown Banknote";
    }

    console.log("getBanknoteTitle: Working with banknote", {
      denomination: item.banknote.denomination,
      year: item.banknote.year
    });

    let title = '';

    if (item.banknote.denomination) {
      title += item.banknote.denomination;
    }

    if (item.banknote.year) {
      if (title) title += ' ';
      title += `(${item.banknote.year})`;
    }

    if (!title) {
      console.log("getBanknoteTitle: Empty title generated");
      return "Unknown Banknote";
    }

    return title;
  }

  // Handle card click to navigate to collection item details
  const handleCardClick = () => {
    if (item?.id) {
      navigate(`/collection-item-unlisted/${item.id}`);
    }
  };

  // Handle delete function
  async function handleDelete(e: React.MouseEvent) {
    // Stop propagation to prevent card click when clicking delete button
    e.stopPropagation();

    if (!item?.id) return;

    setIsDeleting(true);
    try {
      const success = await removeFromCollection(item.id);
      if (success) {
        toast({
          title: "Success",
          description: "Item removed from collection",
        });
        await onUpdate();
      } else {
        throw new Error("Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Error",
        description: "Failed to remove item from collection",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  // Handle edit button click with stopPropagation
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  // Handle delete button click with stopPropagation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  // Render list view if requested
  if (viewMode === 'list') {
    return (
      <Card
        className="flex flex-row overflow-hidden cursor-pointer hover:shadow-md transition-all"
        onClick={handleCardClick}
      >
        <div className="w-24 flex-shrink-0 flex items-center justify-center">
          {displayImage && displayImage !== '/placeholder.svg' ? (
            <BanknoteImage
              imageUrl={displayImage}
              alt={getBanknoteTitle()}
              className="object-contain w-full h-auto max-h-24"
            />
          ) : (
            <AspectRatio ratio={4 / 2}>
              <img
                src="/placeholder.svg"
                alt="Placeholder"
                className="w-full h-full object-cover"
              />
            </AspectRatio>
          )}
        </div>
        <div className="flex-grow flex flex-col justify-between p-3">
          <div>
            <h3 className="font-medium truncate">{getBanknoteTitle()}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {item?.banknote?.country || "Unknown Country"} · {item?.banknote?.series || "Unknown Series"}
            </p>
            <div className="flex gap-2 mt-1">
            {item?.condition && !item?.grade && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'}`}>
                  {item.condition}
                </span>
              )}
             {item?.grade && (
  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
    {item.grade_by && `${item.grade_by} `}{item.grade}
  </span>
)}
              {item?.isForSale && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                  For Sale: {formatPrice(item.salePrice)}
                </span>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex justify-end gap-1 mt-2" onClick={e => e.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={handleEditClick}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleDeleteClick}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Default grid view
  return (
    <>
      <Card
        className="overflow-hidden transition-all hover:shadow-md cursor-pointer hover:scale-[1.01]"
        onClick={handleCardClick}
      >
        <div className="relative">
          <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold">{item.banknote.denomination}</h4>

              {item?.condition && !item?.grade && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'}`}>
                  {item.condition}
                </span>
              )}
              {item?.grade && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
                  {item.grade_by && `${item.grade_by} `}{item.grade}
                </span>
              )}
            </div>
            <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm pt-2">
              <h6 className="font-bold text-sm">Unlisted Banknote</h6>

            </div>
          </div>
        </div>
        <div className="relative w-full flex justify-center items-center bg-muted">
          {displayImage && displayImage !== '/placeholder.svg' ? (
            <BanknoteImage
              imageUrl={displayImage}
              alt={getBanknoteTitle()}
              className="object-contain w-full h-auto max-h-60"
            />
          ) : (
            <AspectRatio ratio={4 / 2}>
              <img
                src="/placeholder.svg"
                alt="Placeholder"
                className="w-full h-full object-cover"
              />
            </AspectRatio>
          )}
        </div>
        <div className="p-3 bg-background border-t">

          {item.banknote.name && (
            <p className="text-sm text-muted-foreground">
              {item.banknote.name}
            </p>
          )}

          {/* here, in the future, we will replace the seal name with the serial number */}
          {/* {item.banknote.sealNames && (
            <p className="text-xs text-muted-foreground">
              Seals: {item.banknote.sealNames}
            </p>
          )} */}
          {item?.isForSale && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
              For Sale: {formatPrice(item.salePrice)}
            </span>
          )}
        </div>
      </Card>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this banknote from your collection?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CollectionCardUnlisted;
