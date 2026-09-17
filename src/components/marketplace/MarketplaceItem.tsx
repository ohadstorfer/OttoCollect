import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceItem as MarketplaceItemType, UserRank } from "@/types";
import { Eye, MessageCircle, LogIn, ShoppingBag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { setListingSold, setRealizedPrice } from "@/services/marketplaceService";
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
import LazyImage from "@/components/shared/LazyImage";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import {
  formatAuctionDateTimeParts,
  formatListingPrice,
  formatReferenceCode,
  getListingHostname,
  isListingEnded,
} from '@/lib/marketplaceListing';

interface MarketplaceItemProps {
  item: MarketplaceItemType;
  className?: string;
}

const MarketplaceItem = ({ item, className }: MarketplaceItemProps) => {
  
  const [isHovering, setIsHovering] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  // Optimistic owner-only inline controls (spec §8.2).
  const [soldState, setSoldState] = useState(Boolean(item.is_sold));
  // "Mark as Item Sold" is only a selection; Update commits it (client remark 8.1 §4b).
  const [soldSelected, setSoldSelected] = useState(Boolean(item.is_sold));
  const [savingSold, setSavingSold] = useState(false);
  const [realizedState, setRealizedState] = useState<number | null>(item.realized_price ?? null);
  // Prefilled so the owner can correct an already-entered price, not only add one.
  const [realizedInput, setRealizedInput] = useState(
    item.realized_price != null ? String(item.realized_price) : ''
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { direction, currentLanguage } = useLanguage();
  const { t } = useTranslation(['marketplace', 'messaging']);
  
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
  const isOwner = Boolean(user?.id && user.id === item.sellerId);
  const auctionEnded = isAuction && isListingEnded(item);
  const showSource = Boolean(item.external_listing_url && item.is_url_approved);
  const sourceHostname = getListingHostname(item.external_listing_url);
  const auctionDateTime = item.auction_at
    ? formatAuctionDateTimeParts(item.auction_at, item.auction_timezone ?? null)
    : null;
  const handleViewSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.external_listing_url!, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmSold = async () => {
    if (!soldSelected || soldState || savingSold) return;
    setSavingSold(true);
    setSoldState(true);
    const ok = await setListingSold(item.id, true);
    setSavingSold(false);
    if (!ok) {
      setSoldState(false);
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
  };

  const handleUpdateRealized = async () => {
    const price = parseFloat(realizedInput);
    if (Number.isNaN(price)) return;
    const ok = await setRealizedPrice(item.id, price);
    if (ok) {
      setRealizedState(price);
    } else {
      toast({ title: t('listing.saveError'), variant: 'destructive' });
    }
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
          {/* Fixed 4:3 frame so card heights stay even, but the note is fitted
              inside it, never cropped: the whole slab/note is what a buyer
              judges (client remark 8.1 §1). No hover zoom — it would crop. */}
          <div className="aspect-[4/3] overflow-hidden">
            <LazyImage
              src={displayImage}
              alt={`${getLocalizedField(banknote.country, 'country')} ${getLocalizedField(banknote.denomination, 'face_value')} (${banknote.year})`}
              className="w-full h-full object-contain"
              fallback="/placeholder.svg"
            />
          </div>
          
          {!isAuction && salePrice != null && (
            <div className="absolute top-0 left-0 bg-ottoman-800/95 text-white px-3 py-1 flex items-center text-xl font-bold">
              {formatListingPrice(salePrice, item.currency)}
            </div>
          )}

          {item.status === 'Draft' && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">{t('listing.draft')}</Badge>
            </div>
          )}
          {item.status === 'PendingUrl' && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary">{t('listing.waitingUrlApproval')}</Badge>
            </div>
          )}

          {/* Prominent result labels (spec §8b/§8c). */}
          {!isAuction && soldState && (
            <div className="absolute bottom-0 inset-x-0 bg-destructive/90 text-destructive-foreground text-center text-lg font-bold py-1">
              {t('listing.itemSold')}
            </div>
          )}
          {isAuction && realizedState != null && (
            <div className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-center text-lg font-bold py-1">
              {t('listing.priceRealizedLabel', { price: formatListingPrice(realizedState, item.currency) })}
            </div>
          )}
        </div>
        
        <CardHeader className="pt-2.5 pb-0 px-4">
          <div className={`flex justify-between items-start ${direction === "rtl" ? "text-right" : "text-left"}`}>
            <div>

            <div className="flex items-center gap-1">
              <h3 className="text-xl font-serif font-semibold text-parchment-500">
                <span> {getLocalizedField(banknote.denomination, 'face_value')} </span>
                </h3>
                {banknote.extendedPickNumber && (
                    <span className="text-m font-bold text-black-400">
                      ({banknote.newExtendedPickNumber || banknote.extendedPickNumber})
                    </span>
                  )}
                  </div>

                  <p className="text-base text-ottoman-800 dark:text-ottoman-200">
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
          {/* Seller sits directly under the country/year line, above the remark
              and the auction details. */}
          {seller && (
            // Wraps in whole pieces: on a narrow card the rank badge drops below
            // the name as one pill instead of both squeezing onto two lines.
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
              <span className="text-sm text-ottoman-600 dark:text-ottoman-400">{tWithFallback('item.seller', 'Seller')}:</span>
              <span className="text-base text-ottoman-700 dark:text-ottoman-200 min-w-0 break-words">{seller.username}</span>
              <Badge variant="user" rank={sellerRank} role={seller.role} className="shrink-0 whitespace-nowrap" />
            </div>
          )}

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
                  <p className="font-bold flex flex-wrap gap-x-4">
                    <span>{auctionDateTime.date}</span>
                    <span>{auctionDateTime.time}</span>
                  </p>
                </div>
              )}
              {/* Inline row that wraps: short values sit side by side on a wide
                  card instead of each taking a full line. */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {item.lot_number && <span>{t('listing.lot')}: {item.lot_number}</span>}
                {item.start_price != null && <span>{t('listing.startPrice')}: {formatListingPrice(item.start_price, item.currency)}</span>}
                {item.estimated_price && <span>{t('listing.estimatedPrice')}: {formatListingPrice(item.estimated_price, item.currency)}</span>}
                {realizedState != null && (
                  <span className="font-bold">{t('listing.realizedPrice')}: {formatListingPrice(realizedState, item.currency)}</span>
                )}
              </div>
            </div>
          )}

          {/* Buy-now listings get the Contact button here, styled like View Source
              on auction cards, so both card types share the same primary action look. */}
          {/* The seller sees their own button greyed out, so the card reads the
              same as everyone else's (client remark 8.1 §4a). */}
          {!isAuction && isOwner && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <Button disabled className="w-full bg-muted text-muted-foreground font-semibold disabled:opacity-100">
                {t('contactSeller.contactButton', { ns: 'messaging' })}
              </Button>
            </div>
          )}
          {!isAuction && !isOwner && (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <ContactSellerButton
                item={item}
                buttonClassName="w-full bg-ottoman-600 hover:bg-ottoman-700 text-white font-semibold"
                buttonVariant="default"
                buttonSize="default"
                hideIcon
              />
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
          <p className="text-center text-lg font-bold text-black dark:text-white">
            {isAuction ? t('listing.auctionItem') : t('listing.buyNowItem')}
          </p>
          {item.reference_code && (
            <p className="text-center text-xs text-muted-foreground">
              {t('listing.referenceId')} {formatReferenceCode(item.reference_code)}
            </p>
          )}

          {/* Owner-only inline controls (spec §8.2) */}
          {isOwner && !isAuction && item.status === 'Available' && (
            <div
              className="mt-1 flex items-center justify-between gap-2 border-t border-ottoman-300/70 dark:border-ottoman-700 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={soldSelected}
                disabled={soldState}
                onClick={() => setSoldSelected((v) => !v)}
                className="flex items-center gap-2 text-sm disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border transition-colors duration-150",
                    soldSelected ? "border-ottoman-600" : "border-ottoman-400"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full bg-ottoman-600 transition-[transform,opacity] duration-150 ease-out",
                      soldSelected ? "scale-100 opacity-100" : "scale-50 opacity-0"
                    )}
                  />
                </span>
                {t('listing.markAsSold')}
              </button>
              <Button
                size="sm"
                disabled={!soldSelected || soldState || savingSold}
                onClick={handleConfirmSold}
                className={cn(
                  "min-w-20 font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97] disabled:opacity-100",
                  soldSelected && !soldState
                    ? "bg-ottoman-600 hover:bg-ottoman-700 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {soldState ? t('listing.sold') : t('listing.update')}
              </Button>
            </div>
          )}
          {isOwner && isAuction && auctionEnded && (
            <div className="space-y-1 pt-1" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm">{t('listing.enterRealizedPrice')}</p>
              <div className="flex gap-2">
                <Input
                  className="h-8"
                  value={realizedInput}
                  onChange={(e) => {
                    if (e.target.value === '' || /^[0-9]*\.?[0-9]*$/.test(e.target.value)) {
                      setRealizedInput(e.target.value);
                    }
                  }}
                />
                <Button size="sm" disabled={!realizedInput} onClick={handleUpdateRealized}>
                  {t('listing.update')}
                </Button>
              </div>
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
