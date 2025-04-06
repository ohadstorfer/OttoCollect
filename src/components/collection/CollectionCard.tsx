
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionItem } from "@/types";
import { Eye, Edit, Tag, ArrowUpToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CollectionCardProps {
  item: CollectionItem;
  className?: string;
  onEdit?: (item: CollectionItem) => void;
  onToggleSale?: (item: CollectionItem) => void;
}

const CollectionCard = ({ item, className, onEdit, onToggleSale }: CollectionCardProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const [showReverse, setShowReverse] = useState(false);
  const navigate = useNavigate();
  
  const { banknote, condition, salePrice, isForSale } = item;
  
  const handleViewDetails = () => {
    navigate(`/collection/${item.id}`);
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
  };
  
  const handleToggleSale = () => {
    if (onToggleSale) {
      onToggleSale(item);
    }
  };
  
  // Determine what image to show
  const getDisplayImage = () => {
    if (showReverse) {
      return item.reverseImage || (banknote.imageUrls && banknote.imageUrls.length > 1 ? banknote.imageUrls[1] : '/placeholder.svg');
    } else {
      return item.obverseImage || (banknote.imageUrls && banknote.imageUrls.length > 0 ? banknote.imageUrls[0] : '/placeholder.svg');
    }
  };
  
  return (
    <Card 
      className={cn(
        "ottoman-card overflow-hidden transition-all duration-300 animated-card", 
        isHovering ? "shadow-lg shadow-ottoman-800/30" : "",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative">
        <div 
          className="aspect-[4/3] overflow-hidden cursor-pointer"
          onClick={() => setShowReverse(!showReverse)}
        >
          <img
            src={getDisplayImage()}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) ${showReverse ? 'Reverse' : 'Obverse'}`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
          {(item.obverseImage || item.reverseImage) && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
              {showReverse ? 'Reverse' : 'Obverse'} (Click to flip)
            </div>
          )}
        </div>
        
        {/* For sale indicator */}
        {isForSale && (
          <div className="absolute top-0 left-0 bg-ottoman-600/90 text-white px-3 py-1 flex items-center font-semibold">
            <Tag className="h-4 w-4 mr-1" />
            For Sale: ${salePrice}
          </div>
        )}
        
        {/* Condition badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary">{condition}</Badge>
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-serif font-semibold text-parchment-500">
              {banknote.denomination}
            </h3>
            <p className="text-sm text-ottoman-300">
              {banknote.country}, {banknote.year}
            </p>
          </div>
          <Badge variant="gold" className="self-start">
            {banknote.catalogId}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="flex flex-col gap-1">
          {item.purchaseDate && (
            <p className="text-xs text-ottoman-400">
              Acquired: {new Date(item.purchaseDate).toLocaleDateString()}
            </p>
          )}
          
          {item.publicNote && (
            <p className="text-sm text-ottoman-200 line-clamp-2 mt-1">
              {item.publicNote}
            </p>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm"
          className="text-ottoman-300 hover:text-ottoman-100 hover:bg-ottoman-700/50"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="text-ottoman-300 hover:text-ottoman-100 border-ottoman-700 hover:bg-ottoman-700/50"
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={isForSale ? "destructive" : "primary"}
            size="sm"
            className={isForSale 
              ? "bg-destructive hover:bg-destructive/90 text-white" 
              : "bg-ottoman-600 hover:bg-ottoman-700 text-white"
            }
            onClick={handleToggleSale}
          >
            <ArrowUpToLine className="h-4 w-4" />
            {isForSale ? "Unlist" : "List"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CollectionCard;
