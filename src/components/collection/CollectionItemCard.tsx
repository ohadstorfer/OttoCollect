import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollectionItem, BanknoteCondition } from '@/types';
import { Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { removeFromCollection } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
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
import { Badge } from '../ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

// Define conditional props for the component
export interface CollectionItemCardProps {
  item: CollectionItem;
  onEdit?: () => void;
  onUpdate: () => Promise<void>;
  isOwner: boolean;
  viewMode?: 'grid' | 'list';
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
  item,
  onEdit,
  onUpdate,
  isOwner = false,
  viewMode = 'grid',
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Use thumbnail if available, otherwise fall back to original image
  const displayImage = item?.obverse_image_thumbnail || item?.obverseImage;

  // Super Admins can always see images, others follow normal rules
  const canViewImages = user?.role === 'Super Admin' || isOwner || !item?.hide_images;

  // Determine if we should show placeholder
  const showPlaceholder = !canViewImages || !displayImage || displayImage === '/placeholder.svg';

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
    // Store the current country context
    if (item?.banknote?.country) {
      const countryData = {
        name: item.banknote.country,
        // If we have the country ID, use it, otherwise it will be fetched when needed
        id: (item.banknote as any).countryId || null
      };
      sessionStorage.setItem('lastViewedCountry', JSON.stringify(countryData));
    }
    
    if ((item as any).isMissing) {
      // For missing items, go to banknote details
      navigate(`/banknote-details/${item.banknoteId || item.id}`);
    } else if (item?.id) {
      // For collection items, go to collection item details
      navigate(`/collection-item/${item.id}`);
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
        className={cn(
          "overflow-hidden transition-all duration-300 cursor-pointer bg-card w-full",
          "hover:shadow-md flex flex-row max-w-full"
        )}
        onClick={handleCardClick}
      >
        <div className="flex items-center p-1 ml-1 w-full overflow-hidden">
          {/* Image container - showing both front and back */}
          <div className="flex-shrink-0 flex items-center space-x-1">
            {/* Front image */}
            <div className="h-[58px] w-[90px] flex-shrink-0 overflow-hidden rounded">
              {!showPlaceholder ? (
                <BanknoteImage
                  imageUrl={displayImage}
                  alt={getBanknoteTitle()}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src="/placeholder.svg"
                    alt="Placeholder"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Back image */}
            <div className="h-[58px] w-[90px] flex-shrink-0 overflow-hidden rounded">
              {!showPlaceholder && item?.reverseImage ? (
                <BanknoteImage
                  imageUrl={item.reverseImage}
                  alt={`${getBanknoteTitle()} - Back`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src="/placeholder.svg"
                    alt="Placeholder"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 ml-4 flex flex-col justify-center min-w-0 overflow-hidden">
            <div className="flex justify-between items-start w-full">
              <div className="min-w-0 flex-1 pr-2 overflow-hidden">
                <div className="font-small text-sm truncate">
                  {item?.banknote?.denomination || "Unknown Denomination"}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {item?.banknote?.year || "Unknown Year"}
                </div>
              </div>
              {isOwner && (
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleEditClick} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleDeleteClick} title="Remove from your collection">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="p-0.5 gap-0.5 sm:gap-1.5 flex flex-wrap items-center text-sm mb-1 overflow-hidden">
              {item?.banknote?.extendedPickNumber && (
                <Badge title={"Extended Pick Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {item.banknote.extendedPickNumber}
                </Badge>
              )}
              {item?.banknote?.turkCatalogNumber && (
                <Badge title={"Turkish Catalog Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {item.banknote.turkCatalogNumber}
                </Badge>
              )}
              {item?.condition && !item?.grade && (
                <Badge title={"Condition"} variant="secondary" className={`text-[10px] px-1.5 py-0.5 h-auto leading-tight ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'} shrink-0`}>
                  {item.condition}
                </Badge>
              )}
              {item?.grade && (
                <Badge title={"Grade"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-emerald-100 text-emerald-800 border border-gray-300 shrink-0">
                  {item.grade_by && `${item.grade_by} `}{item.grade}
                </Badge>
              )}
              {item?.isForSale && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-blue-100 text-blue-800 border border-gray-300 shrink-0">
                  {formatPrice(item.salePrice)}
                </Badge>
              )}
            </div>
          </div>
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
              <h4 className="font-bold"><span>{item.banknote.denomination}</span></h4>
              {item?.condition && !item?.grade && (
                <span title={"Condition"} className={`px-2 py-0.5 rounded-full text-xs ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'}`}>
                  {item.condition}
                </span>
              )}
              {item?.grade && (
                <span title={"Grade"} className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
                  {item.grade_by && `${item.grade_by} `}{item.grade}
                </span>
              )}
            </div>
            <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm pt-2">
              {item.banknote.extendedPickNumber && (
                <Badge title={"Extended Pick Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {item.banknote.extendedPickNumber}
                </Badge>
              )}
              {item.banknote.turkCatalogNumber && (
                <Badge title={"Turkish Catalog Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {item.banknote.turkCatalogNumber}
                </Badge>
              )}
              {item.banknote.year && (
                <Badge title={"Year"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {item.banknote.year}
                </Badge>
              )}
              {item.banknote.rarity && (
                <Badge title={"Rarity"}
                  variant="secondary"
                  className="hidden sm:inline text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-red-100 text-red-800 border border-gray-300 hover:bg-red-200 shrink-0"
                >
                  {item.banknote.rarity}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="relative w-full flex justify-center items-center bg-muted">
          {showPlaceholder ? (
            <AspectRatio ratio={4 / 2}>
              <img
                src="/placeholder.svg"
                alt="Placeholder"
                className="w-full h-full object-cover"
              />
            </AspectRatio>
          ) : (
            <div className="relative w-full">
            <BanknoteImage
              imageUrl={displayImage}
              alt={getBanknoteTitle()}
              className="object-contain w-full h-auto max-h-60"
            />
            </div>
          )}
        </div>
        
        <div className="p-3 bg-background border-t">
            {item.banknote.sultanName && (
              <p className="text-xs text-muted-foreground">
                {item.banknote.authorityName || "Authority"}: {item.banknote.sultanName}
              </p>
            )}
            {(item.banknote.signaturesFront || item.banknote.signaturesBack) && (
              <p className="text-xs text-muted-foreground">
                Signatures: {item.banknote.signaturesFront} {item.banknote.signaturesBack}
              </p>
            )}
            {item.banknote.sealNames && (
              <p className="text-xs text-muted-foreground">
                Seals: {item.banknote.sealNames}
              </p>
            )}
            {item.banknote.securityElement && (
              <p className="text-xs text-muted-foreground">
                {item.banknote.securityElement}
              </p>
            )}
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

export default CollectionItemCard;
