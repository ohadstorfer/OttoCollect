import React, { useState } from 'react';
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslation } from 'react-i18next';

interface CollectionItemCardProps {
  banknote: DetailedBanknote;
  collectionItem: CollectionItem;
}

const CollectionItemDetailCard = ({ banknote, collectionItem }: CollectionItemCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation(['catalog']);

  // Helper function to get localized authority name
  const getLocalizedAuthorityName = (): string => {
    const banknoteAny = banknote as any;
    
    if (currentLanguage === 'ar' && banknoteAny.authorityName_ar) {
      return banknoteAny.authorityName_ar;
    } else if (currentLanguage === 'tr' && banknoteAny.authorityName_tr) {
      return banknoteAny.authorityName_tr;
    }
    
    return banknote.authorityName || t('authority', 'Authority');
  };

  const displayImage =
    collectionItem?.obverseImage ||
    (banknote.imageUrls && banknote.imageUrls.length > 0
      ? banknote.imageUrls[0]
      : "/placeholder.svg");

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer",
        isHovering ? "shadow-lg" : ""
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => navigate(`/banknote/${banknote.id}`)}
    >
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Button variant="default" size="sm" disabled>
            <Check className="h-4 w-4 mr-1" />
            Owned
          </Button>
        </div>

        <div
          className={cn(
            displayImage === "/placeholder.svg" ? "aspect-[4/2]" : "aspect-[4/3]",
            "overflow-hidden"
          )}
        >
          <img
            src={displayImage}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>

        {collectionItem?.isForSale && (
          <div className="absolute top-0 left-0 bg-green-600/90 text-white px-2 py-1 text-xs font-medium">
            For Sale: ${collectionItem.salePrice}
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium"><span>{banknote.denomination}</span></h3>
            <p className="text-sm text-muted-foreground">
              {banknote.country} {banknote.year}
            </p>
            {banknote.pickNumber && (
              <p className="text-sm text-muted-foreground">
                Pick Number: {banknote.pickNumber}
              </p>
            )}
            {banknote.sultanName && (
              <p className="text-sm text-muted-foreground">
                {getLocalizedAuthorityName()}: {banknote.sultanName}
              </p>
            )}
            {banknote.sealNames && (
              <p className="text-sm text-muted-foreground">
                Seal Names: {banknote.sealNames}
              </p>
            )}
            {banknote.turkCatalogNumber && (
              <p className="text-sm text-muted-foreground">
                Turk Catalog Number: {banknote.turkCatalogNumber}
              </p>
            )}
            {banknote.rarity && (
              <p className="text-sm text-muted-foreground">
                Rarity: {banknote.rarity}
              </p>
            )}
          </div>
          {collectionItem?.condition && (
            <Badge variant="secondary" className="self-start">
              {collectionItem.condition}
            </Badge>
          )}
        </div>
      </CardHeader>
    </Card>
  );
};

export default CollectionItemDetailCard;
