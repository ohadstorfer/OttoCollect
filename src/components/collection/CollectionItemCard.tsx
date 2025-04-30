
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { CollectionItem, Banknote } from '@/types';
import { formatCurrency } from '@/lib/formatters';

interface CollectionItemCardProps {
  item: CollectionItem;
  banknote: Banknote;
}

const CollectionItemCard = ({ item, banknote }: CollectionItemCardProps) => {
  // Safely get the first image URL
  const getFirstImageUrl = () => {
    if (!banknote || !banknote.imageUrls) return '/placeholder.svg';
    
    if (Array.isArray(banknote.imageUrls) && banknote.imageUrls.length > 0) {
      return banknote.imageUrls[0];
    }
    
    if (typeof banknote.imageUrls === 'string') {
      return banknote.imageUrls;
    }
    
    return '/placeholder.svg';
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md h-full">
      <div className="aspect-video relative overflow-hidden">
        <img
          src={item?.obverseImage || getFirstImageUrl()}
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
            <h3 className="font-medium text-lg leading-tight">{banknote?.denomination || 'Unknown Denomination'}</h3>
            <p className="text-sm text-muted-foreground">
              {banknote?.country || 'Unknown Country'}, {banknote?.year || 'Unknown Year'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {item?.condition || 'Unknown'}
              </Badge>
              {item?.isForSale && item?.salePrice && (
                <Badge variant="outline" className="text-ottoman-500 font-medium text-xs">
                  {formatCurrency(item.salePrice)}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionItemCard;
