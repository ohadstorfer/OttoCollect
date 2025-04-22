
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollectionItem } from '@/types';
import { Edit, Star, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface CollectionItemCardProps {
  collectionItem: CollectionItem;
  onItemEdit?: () => void;
  onCollectionUpdated?: () => Promise<void>;
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({ 
  collectionItem, 
  onItemEdit,
  onCollectionUpdated
}) => {
  const navigate = useNavigate();
  const { banknote, condition, isForSale, salePrice } = collectionItem;
  
  const handleCardClick = () => {
    navigate(`/banknotes/${banknote.id}?source=collection`);
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onItemEdit) {
      onItemEdit();
    }
  };
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-ottoman-200/20"
      onClick={handleCardClick}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img 
          src={
            collectionItem.obverseImage || 
            (Array.isArray(banknote.imageUrls) ? banknote.imageUrls[0] : banknote.imageUrls) || 
            '/placeholder.svg'
          } 
          alt={`${banknote.country} ${banknote.denomination}`}
          className="w-full h-full object-contain"
        />
        {isForSale && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              For Sale
            </Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-3">
        <h3 className="font-medium truncate">{banknote.denomination}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{banknote.country}, {banknote.year}</span>
          <Badge variant="outline" className="text-xs">{condition}</Badge>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex justify-between">
        <div>
          {isForSale && salePrice && (
            <span className="font-semibold text-ottoman-500">${salePrice}</span>
          )}
        </div>
        {onItemEdit && (
          <Button size="sm" variant="ghost" onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CollectionItemCard;
