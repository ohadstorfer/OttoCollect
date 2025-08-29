import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceItem as MarketplaceItemType, UserRank } from "@/types";
import { Eye, MessageCircle, LogIn, ShoppingBag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ContactSellerButton } from "@/components/marketplace/ContactSellerButton";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

interface MarketplaceItemProps {
  item: MarketplaceItemType;
  className?: string;
}

const MarketplaceItem = ({ item, className }: MarketplaceItemProps) => {
  
  const [isHovering, setIsHovering] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { direction } = useLanguage();
  const { t } = useTranslation(['marketplace']);
  
  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);
  
  const { collectionItem, seller, status } = item;
  
  // Safety check - if collectionItem or banknote is undefined, render a placeholder
  if (!collectionItem || !collectionItem.banknote) {
    console.error('Missing collection item or banknote data in MarketplaceItem', item);
    return (
      <Card className={cn("ottoman-card overflow-hidden p-4 text-center", className)}>
        <p>{tWithFallback('status.noItems', 'No Items Found')}</p>
      </Card>
    );
  }
  
 
  
  const { banknote, condition, salePrice, publicNote } = collectionItem;
  
  const handleViewDetails = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    navigate(`/marketplace/${item.id}`);
  };
  
  const handleAuthNavigate = () => {
    setShowAuthDialog(false);
    navigate('/auth');
  };
  
  const getStatusBadge = () => {
    
    switch (status) {
      case "Available":
        return <Badge variant="primary">{tWithFallback('item.status.available', 'Available')}</Badge>;
      case "Reserved":
        return <Badge variant="secondary">{tWithFallback('item.status.reserved', 'Reserved')}</Badge>;
      case "Sold":
        return <Badge variant="destructive">{tWithFallback('item.status.sold', 'Sold')}</Badge>;
      default:
        return null;
    }
  };
  
  const sellerRank = (seller?.rank || "Newbie") as UserRank;
  
  // More robust image selection with fallbacks
  const displayImage = collectionItem.obverseImage ||'/placeholder.svg';
  
 
  
  return (
    <>
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
                isHovering ? "scale-105" : "scale-100"
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
          <div className={`flex justify-between items-start ${direction === "rtl" ? "text-right" : "text-left"}`}>
            <div>

            <div className="flex items-center gap-1">
              <h3 className="text-lg font-serif font-semibold text-parchment-500">
                <span> {banknote.denomination} </span>
                </h3>
                {banknote.extendedPickNumber && (
                    <span className="text-m font-bold text-black-400">
                      ({banknote.extendedPickNumber})
                    </span>
                  )}
                  </div>

                  <p className="text-sm text-ottoman-300">
                    {banknote.country}
                    {banknote.country && banknote.year && ', '}
                    {banknote.year}
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
        
        <CardContent className={`pt-0 pb-1 px-4 ${direction === "rtl" ? "text-right" : "text-left"}`}>
          {publicNote && (
            <p className="text-sm text-ottoman-200 line-clamp-2 mb-2">
              {publicNote}
            </p>
          )}
          
          {seller && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-ottoman-400">{tWithFallback('item.seller', 'Seller')}:</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-ottoman-200">{seller.username}</span>
                <Badge variant="user" rank={sellerRank} role={seller.role} className="ml-1" />
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-2 pb-0 px-4 flex justify-between">
          <ContactSellerButton item={item} />
        </CardFooter>
      </Card>

      <AuthRequiredDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />
    </>
  );
};

export default MarketplaceItem;
