
import { useState } from 'react';
import { CollectionItem } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router-dom';

interface CollectionItemCardProps {
  item: CollectionItem;
  className?: string;
}

const CollectionItemCard = ({ item, className }: CollectionItemCardProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  
  const { banknote, condition, purchasePrice, publicNote, obverseImage } = item;
  
  // Determine which image to show, prioritizing obverse_image
  const displayImage = obverseImage || 
    (banknote.imageUrls && banknote.imageUrls.length > 0 
      ? banknote.imageUrls[0] 
      : '/placeholder.svg');
  
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300",
        isHovering ? "shadow-lg" : "",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={displayImage}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-serif font-semibold">
              {banknote.denomination}
            </h3>
            <p className="text-sm text-muted-foreground">
              {banknote.country}, {banknote.year}
            </p>
          </div>
          <Badge variant="secondary" className="self-start">
            {condition}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        {publicNote && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {publicNote}
          </p>
        )}
        
        {purchasePrice && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Purchased for:</span>
            <span className="text-sm font-medium">${purchasePrice}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/banknote/${banknote.id}`, { state: { source: 'collection', itemId: item.id } })}
        >
          <Eye className="h-4 w-4 mr-1" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CollectionItemCard;
