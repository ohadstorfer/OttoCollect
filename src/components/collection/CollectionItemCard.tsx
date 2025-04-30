
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, Edit, Trash } from 'lucide-react';
import { CollectionItem, Banknote } from '@/types';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { getFirstImageUrl } from '@/types/banknote';

export interface CollectionItemCardProps {
  item: CollectionItem;
  isPublicView?: boolean;
  onItemEdit?: (item: CollectionItem) => void;
  onCollectionUpdated?: () => Promise<void>;
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({ 
  item, 
  isPublicView = false,
  onItemEdit,
  onCollectionUpdated
}) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Use null checks to prevent errors
  const banknote = item?.banknote || {};
  
  const handleViewDetail = () => {
    if (isPublicView) {
      // For public view, navigate to the collection item detail page
      navigate(`/collection-item/${item.id}`);
    } else {
      // For personal view, navigate to my collection item detail
      navigate(`/my-collection/${item.id}`);
    }
  };
  
  const handleEdit = () => {
    if (onItemEdit) {
      onItemEdit(item);
    }
  };
  
  const handleDelete = async () => {
    try {
      // This will be implemented in a future step
      setShowDeleteDialog(false);
      if (onCollectionUpdated) {
        await onCollectionUpdated();
      }
    } catch (error) {
      console.error('Error deleting collection item:', error);
    }
  };
  
  // Get image URLs safely
  const obverseImage = item?.obverseImage || 
                      (banknote?.imageUrls ? getFirstImageUrl(banknote.imageUrls) : '/placeholder.svg');
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md h-full">
      <div className="aspect-video relative overflow-hidden cursor-pointer" onClick={handleViewDetail}>
        <img
          src={obverseImage}
          alt={banknote?.denomination || 'Banknote'}
          className="w-full h-full object-cover"
        />
        {item?.isForSale && (
          <Badge className="absolute top-2 right-2 bg-ottoman-500 text-white">
            For Sale
          </Badge>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg leading-tight">
              {banknote?.denomination || 'Unknown Denomination'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {banknote?.country || 'Unknown Country'}, {banknote?.year || 'Unknown Year'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {item?.condition || 'Unknown Condition'}
              </Badge>
              {item?.isForSale && item?.salePrice && (
                <Badge variant="outline" className="text-ottoman-500 font-medium text-xs">
                  {formatCurrency(item.salePrice)}
                </Badge>
              )}
            </div>
          </div>
          
          {!isPublicView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewDetail}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Item
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash className="h-4 w-4 mr-2" /> Remove Item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {isPublicView && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleViewDetail}>
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this item from your collection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CollectionItemCard;
