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
import { formatAuctionDateTime, getListingHostname } from '@/lib/marketplaceListing';

interface MarketplaceItemProps {
  item: MarketplaceItemType;
  className?: string;
}

const MarketplaceItem = ({ item, className }: MarketplaceItemProps) => {
  
  const [isHovering, setIsHovering] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { direction, currentLanguage } = useLanguage();
  const { t } = useTranslation(['marketplace']);
  
  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Helper function to get localized field values
  const getLocalizedField = (field: string, fieldType: 'face_value' | 'country'): string => {
    if (currentLanguage === 'en' || !field) {
      return field || '';
    }

    const banknoteAny = banknote as any;
    let languageSpecificField: string | undefined;
    
    if (currentLanguage === 'ar') {
      languageSpecificField = banknoteAny?.[`${fieldType}_ar`];
    } else if (currentLanguage === 'tr') {
      languageSpecificField = banknoteAny?.[`${fieldType}_tr`];
    }

    return languageSpecificField || field;
  };
  
  const { collectionItem, seller } = item;
  
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

  const isAuction = item.listing_type === 'auction';
  const showSource = Boolean(item.external_listing_url && item.is_url_approved);
  const sourceHostname = getListingHostname(item.external_listing_url);
  const auctionDateTime = item.auction_at
    ? formatAuctionDateTime(item.auction_at, item.auction_timezone ?? null)
    : null;
  const handleViewSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.external_listing_url!, '_blank', 'noopener,noreferrer');
  };

  const handleViewDetails = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    
    navigate(`/marketplace-item/${item.id}`);

  };
  
  const handleAuthNavigate = () => {
    setShowAuthDialog(false);
    navigate('/auth');
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
              alt={`${getLocalizedField(banknote.country, 'country')} ${getLocalizedField(banknote.denomination, 'face_value')} (${banknote.year})`}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                isHovering ? "scale-105" : "scale-100"
              )}
            />
          </div>
          
          {!isAuction && salePrice != null && (
            <div className="absolute top-0 left-0 bg-ottoman-700/95 text-white px-3 py-1 flex items-center text-lg font-bold">
              ${salePrice}
            </div>
          )}

          {item.is_sold && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive">{t('listing.sold')}</Badge>
            </div>
          )}
        </div>
        
        <CardHeader className="pt-2.5 pb-0 px-4">
          <div className={`flex justify-between items-start ${direction === "rtl" ? "text-right" : "text-left"}`}>
            <div>

            <div className="flex items-center gap-1">
              <h3 className="text-lg font-serif font-semibold text-parchment-500">
                <span> {getLocalizedField(banknote.denomination, 'face_value')} </span>
                </h3>
                {banknote.extendedPickNumber && (
                    <span className="text-m font-bold text-black-400">
                      ({banknote.newExtendedPickNumber || banknote.extendedPickNumber})
                    </span>
                  )}
                  </div>

                  <p className="text-base text-ottoman-600 dark:text-ottoman-300">
                    {getLocalizedField(banknote.country, 'country')}
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
          {(item.public_remark || publicNote) && (
            <p className="text-sm text-ottoman-700 dark:text-ottoman-200 line-clamp-2 mb-2">
              {item.public_remark || publicNote}
            </p>
          )}

          {isAuction && (
            <div className="mt-2 space-y-0.5 text-sm">
              {auctionDateTime && (
                <div className="rounded border border-ottoman-200 dark:border-ottoman-700 bg-muted/40 px-2 py-1">
                  <p className="text-xs text-muted-foreground">{t('listing.auctionDateTime')}</p>
                  <p className="font-bold">{auctionDateTime}</p>
                </div>
              )}
              {item.lot_number && <p>{t('listing.lot')}: {item.lot_number}</p>}
              {item.start_price != null && <p>{t('listing.startPrice')}: ${item.start_price}</p>}
              {item.estimated_price && <p>{t('listing.estimatedPrice')}: ${item.estimated_price}</p>}
              {item.realized_price != null && <p>{t('listing.realizedPrice')}: ${item.realized_price}</p>}
            </div>
          )}

          {seller && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-ottoman-600 dark:text-ottoman-400">{tWithFallback('item.seller', 'Seller')}:</span>
              <div className="flex items-center gap-1">
                <span className="text-base text-ottoman-700 dark:text-ottoman-200">{seller.username}</span>
                <Badge variant="user" rank={sellerRank} role={seller.role} className="ml-1" />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 pb-3 px-4 flex flex-col items-stretch gap-1">
          {showSource && (
            <>
              <Button
                className="w-full bg-ottoman-600 hover:bg-ottoman-700 text-white font-semibold"
                onClick={handleViewSource}
              >
                {t('listing.viewSource')}
              </Button>
              {sourceHostname && (
                <p className="text-center text-sm text-ottoman-700 dark:text-ottoman-300">{sourceHostname}</p>
              )}
            </>
          )}
          <p className="text-center text-base font-semibold text-foreground">
            {isAuction ? t('listing.auctionItem') : t('listing.buyNowItem')}
          </p>
          {!isAuction && (
            <div className="flex justify-between pt-1" onClick={(e) => e.stopPropagation()}>
              <ContactSellerButton item={item} />
            </div>
          )}
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
