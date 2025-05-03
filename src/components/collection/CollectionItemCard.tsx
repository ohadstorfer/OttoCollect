import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollectionItem, BanknoteCondition } from '@/types';
import { Pencil, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { BanknoteImage } from '@/components/use-banknote-image';
import { formatPrice } from '@/utils/formatters';
import { BANKNOTE_CONDITIONS } from '@/lib/constants';

// Define conditional props for the component
export interface CollectionItemCardProps {
  item: CollectionItem;
  onEdit?: () => void;
  onUpdate: () => Promise<void>;
  isPublic?: boolean;
  viewMode?: 'grid' | 'list';
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
  item,
  onEdit,
  onUpdate,
  isPublic = false,
  viewMode = 'grid'
}) => {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Use custom images if available, otherwise fall back to banknote images
  const displayImage = item?.obverseImage || 
    (item?.banknote ? item.banknote.imageUrls : null);

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
    if (!item?.banknote) return "Unknown Banknote";
    
    let title = '';
    
    if (item.banknote.denomination) {
      title += item.banknote.denomination;
    }
    
    if (item.banknote.year) {
      if (title) title += ' ';
      title += `(${item.banknote.year})`;
    }
    
    return title || "Unknown Banknote";
  }

  // Handle delete function
  async function handleDelete() {
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
  
  if (viewMode === 'list') {
    return (
      <Card className="flex flex-row overflow-hidden">
        <div className="w-24 h-24 flex-shrink-0">
          <BanknoteImage 
            imageUrl={displayImage}
            alt={getBanknoteTitle()}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-grow flex flex-col justify-between p-3">
          <div>
            <h3 className="font-medium truncate">{getBanknoteTitle()}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {item?.banknote?.country || "Unknown Country"} · {item?.banknote?.series || "Unknown Series"}
            </p>
            <div className="flex gap-2 mt-1">
              {item?.condition && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'}`}>
                  {item.condition}
                </span>
              )}
              {item?.isForSale && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                  For Sale: {formatPrice(item.salePrice)}
                </span>
              )}
            </div>
          </div>
          {!isPublic && (
            <div className="flex justify-end gap-1 mt-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <div className="relative aspect-[4/2] overflow-hidden bg-muted">
          <BanknoteImage 
            imageUrl={displayImage}
            alt={getBanknoteTitle()}
            className="object-cover w-full h-full"
          />
          {item?.condition && (
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 rounded-md text-xs ${conditionColors[item.condition as BanknoteCondition] || 'bg-gray-100'}`}>
                {item.condition}
              </span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium truncate">{getBanknoteTitle()}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {item?.banknote?.country || "Unknown Country"} · {item?.banknote?.series || "Unknown Series"}
          </p>
          {item?.isForSale && (
            <p className="mt-2 text-sm font-medium">
              <span className="text-blue-600">For Sale: {formatPrice(item.salePrice)}</span>
            </p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/banknote-details/${item?.banknoteId || ''}`}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Link>
          </Button>
          {!isPublic && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete</span>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
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
