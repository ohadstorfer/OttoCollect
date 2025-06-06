import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceItem as MarketplaceItemType, UserRank } from "@/types";
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
  console.log('Rendering MarketplaceItem component with item:', item.id);
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  
  const { collectionItem, seller, status } = item;
  
  // Safety check - if collectionItem or banknote is undefined, render a placeholder
  if (!collectionItem || !collectionItem.banknote) {
    console.error('Missing collection item or banknote data in MarketplaceItem', item);
    return (
      <Card className={cn("ottoman-card overflow-hidden p-4 text-center", className)}>
        <p>Item data unavailable</p>
      </Card>
    );
  }
  
  console.log('Banknote data:', collectionItem.banknote);
  console.log('Seller data:', seller);
  
  const { banknote, condition, salePrice, publicNote } = collectionItem;
  
  const handleViewDetails = () => {
    console.log(`Navigating to marketplace item detail: ${item.id}`);
    navigate(`/marketplace/${item.id}`);
  };
  
  const getStatusBadge = () => {
    console.log('Getting status badge for status:', status);
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
  
  const sellerRank = (seller?.rank || "Newbie") as UserRank;
  
  // More robust image selection with fallbacks
  const displayImage = collectionItem.obverseImage || 
    (collectionItem.personalImages && collectionItem.personalImages.length > 0 
      ? collectionItem.personalImages[0] 
      : banknote.imageUrls && banknote.imageUrls.length > 0 
        ? (typeof banknote.imageUrls === 'string' ? banknote.imageUrls : banknote.imageUrls[0])
        : '/placeholder.svg');
  
  console.log('Display image:', displayImage);
  
  return (
    <Card 
      className={cn(
        "ottoman-card overflow-hidden transition-all duration-300 animated-card", 
        isHovering ? "shadow-lg shadow-ottoman-800/30" : "",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleViewDetails}
    >
      <div className="relative">
        <div className = "w-full h-full object-cover">
          <img
            src={displayImage}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>
        
        <div className="absolute top-0 left-0 bg-ottoman-600/90 text-white px-3 py-1 flex items-center font-semibold">
          ${salePrice}
        </div>
        
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>
      
      <CardHeader className="pt-2.5 pb-0 px-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-serif font-semibold text-parchment-500">
              {banknote.denomination}
            </h3>
            <p className="text-sm text-ottoman-300">
              {banknote.country}, {banknote.year}
            </p>
          </div>
          <div className="self-start">
            {collectionItem.condition && !collectionItem.grade && (
              <Badge variant="secondary">
                {collectionItem.condition}
              </Badge>
            )}
            {collectionItem.grade && (
              <Badge variant="secondary">
                {collectionItem.grade_by && `${collectionItem.grade_by} `}
                {collectionItem.grade}
               
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-1 px-4">
        {publicNote && (
          <p className="text-sm text-ottoman-200 line-clamp-2 mb-2">
            {publicNote}
          </p>
        )}
        
        {seller && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-ottoman-400">Seller:</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-ottoman-200">{seller.username}</span>
              <Badge variant="user" rank={sellerRank} className="ml-1" />
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 pb-0 px-4 flex justify-between">
        

        <ContactSellerButton item={item} />
      </CardFooter>
    </Card>
  );
};

export default MarketplaceItem;
