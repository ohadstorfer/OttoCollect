
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceItem } from "@/types";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ContactSellerButton } from "./ContactSellerButton";

interface MarketplaceItemCardProps {
  marketplaceItem: MarketplaceItem;
}

const MarketplaceItemCard: React.FC<MarketplaceItemCardProps> = ({ marketplaceItem }) => {
  const navigate = useNavigate();
  
  const handleViewDetails = () => {
    navigate(`/marketplace/${marketplaceItem.id}`);
  };
  
  const getStatusBadge = () => {
    switch (marketplaceItem.status) {
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
  
  // Get image from collection item or use placeholder
  const displayImage = marketplaceItem.collectionItem.obverseImage || 
    '/placeholder.svg';
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={displayImage}
            alt="Banknote"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="absolute top-0 left-0 bg-primary/90 text-primary-foreground px-3 py-1 font-semibold">
          ${marketplaceItem.collectionItem.salePrice}
        </div>
        
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">
              {marketplaceItem.collectionItem.banknoteId}
            </h3>
            <p className="text-sm text-muted-foreground">
              Condition: {marketplaceItem.collectionItem.condition}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-grow">
        {marketplaceItem.collectionItem.publicNote && (
          <p className="text-sm line-clamp-2 mb-2">
            {marketplaceItem.collectionItem.publicNote}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Seller:</span>
          <span className="text-sm">{marketplaceItem.seller.username}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-2 flex justify-between">
        <Button 
          size="sm"
          variant="outline"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
        
        <ContactSellerButton item={marketplaceItem} />
      </CardFooter>
    </Card>
  );
};

export default MarketplaceItemCard;
