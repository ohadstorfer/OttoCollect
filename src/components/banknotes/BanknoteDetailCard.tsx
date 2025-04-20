
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";

interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  collectionItem?: CollectionItem;
  source?: 'catalog' | 'collection' | 'missing';
  ownerId?: string;
}

const BanknoteDetailCard = ({ banknote, source = 'catalog' }: BanknoteDetailCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  const handleCardClick = () => {
    if (source === 'catalog') {
      navigate(`/catalog-banknote/${banknote.id}`);
    } else if (source === 'collection') {
      navigate(`/collection-banknote/${banknote.id}`);
    } else {
      navigate(`/banknote/${banknote.id}`, { state: { source } });
    }
  };

  // Determine which image to show
  const displayImage = banknote.imageUrls && banknote.imageUrls.length > 0
    ? banknote.imageUrls[0]
    : '/placeholder.svg';

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer bg-card",
        isHovering ? "shadow-lg" : ""
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleCardClick}
    >


      <div className="relative">
        {/* Top Header Section */}
        <div className="pt-2 pr-2 pb-4 pl-2 border-b">
          {/* Title + Plus Button */}
          <div className="flex justify-between items-start">
            <h4 className="font-bold">{banknote.denomination}</h4>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Info Bar / Badges */}
          <div className=" sm:px-0 flex flex-wrap gap-1.5 items-center text-sm">
            {banknote.extendedPickNumber && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                {banknote.extendedPickNumber}
              </Badge>
            )}
            {banknote.pickNumber && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                {banknote.turkCatalogNumber}
              </Badge>
            )}
            {banknote.year && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                {banknote.year}
              </Badge>
            )}
            {banknote.rarity && (
              <Badge
                variant="secondary"
                className="hidden sm:inline text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-red-100 text-red-800 border border-gray-300 hover:bg-red-200 shrink-0"
              >
                {banknote.rarity}
              </Badge>
            )}
          </div>
        </div>




        {/* Image Section */}
        <div className={cn(
          displayImage === "/placeholder.svg" ? "aspect-[4/2]" : "aspect-[4/2]",
          "overflow-hidden"
        )}>
          <img
            src={displayImage}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-background border-t">
          {banknote.sultanName && (
            <p className="text-xs text-muted-foreground">
              Sultan: {banknote.sultanName}
            </p>
          )}
          {banknote.sealNames && (
            <p className="text-xs text-muted-foreground">
              Seals: {banknote.sealNames}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BanknoteDetailCard;
