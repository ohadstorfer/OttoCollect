
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
        <div className="flex justify-between items-start p-4 border-b">
          <h3 className="text-2xl font-bold">{banknote.denomination}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Info Bar */}
        <div className="px-4 py-2 bg-muted/20 flex flex-wrap gap-2 items-center text-sm">
          {banknote.pickNumber && (
            <span className="whitespace-nowrap">Pick: {banknote.pickNumber}</span>
          )}
          {banknote.extendedPickNumber && (
            <span className="whitespace-nowrap">Turk: {banknote.extendedPickNumber}</span>
          )}
          {banknote.year && (
            <span className="whitespace-nowrap">{banknote.year}</span>
          )}
          {banknote.rarity && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
              {banknote.rarity}
            </Badge>
          )}
        </div>

        {/* Image Section */}
        <div className={cn(
          displayImage === "/placeholder.svg" ? "aspect-[4/2]" : "aspect-[4/3]",
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
        <div className="p-4 bg-background border-t">
          {banknote.sultanName && (
            <p className="text-sm text-muted-foreground">
              Sultan: {banknote.sultanName}
            </p>
          )}
          {banknote.sealNames && (
            <p className="text-sm text-muted-foreground">
              Seals: {banknote.sealNames}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BanknoteDetailCard;
