
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceItem as MarketplaceItemType } from "@/types";
import { Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContactSellerButton } from "@/components/marketplace/ContactSellerButton";

interface MarketplaceItemProps {
  item: MarketplaceItemType;
  className?: string;
}

const MarketplaceItem = ({ item, className }: MarketplaceItemProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  
  const { collectionItem, seller, status } = item;
  const { banknote, condition, salePrice, publicNote } = collectionItem;
  
  const handleViewDetails = () => {
    navigate(`/marketplace/${item.id}`);
  };
  
  const getStatusBadge = () => {
    switch (status) {
      case "Available":
        return <Badge variant="primary">Available</Badge>;
      case "Reserved":
        return <Badge variant="secondary">Reserved</Badge>;
      case "Sold":
        return <Badge variant="destructive">Sold</Badge>;
      default:
        return null;
    }
  };
  
  // Determine which image to show
  const displayImage = collectionItem.obverseImage || 
    (collectionItem.personalImages && collectionItem.personalImages.length > 0 
      ? collectionItem.personalImages[0] 
      : banknote.imageUrls[0] || '/placeholder.svg');
  
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
        
        {/* Price tag */}
        <div className="absolute top-0 left-0 bg-ottoman-600/90 text-white px-3 py-1 flex items-center font-semibold">
          ${salePrice}
        </div>
        
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
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
          <Badge variant="secondary" className="self-start">
            {condition}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        {publicNote && (
          <p className="text-sm text-ottoman-200 line-clamp-2 mb-2">
            {publicNote}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-ottoman-400">Seller:</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-ottoman-200">{seller.username}</span>
            <Badge variant="user" rank={seller.rank} className="ml-1" />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex justify-between">
        <Button 
          // variant="ghost" 
          size="sm"
          className="text-ottoman-300 text-ottoman-100 bg-ottoman-700/50 hover:bg-ottoman-800/50"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          className="text-ottoman-300 hover:text-ottoman-100 hover:bg-ottoman-700/50"
          onClick={handleViewDetails}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message Seller
        </Button>
        
        <ContactSellerButton item={item} />
      </CardFooter>
    </Card>
  );
};

export default MarketplaceItem;
