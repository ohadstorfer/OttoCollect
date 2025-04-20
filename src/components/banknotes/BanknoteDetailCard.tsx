
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
          {/* Left Section: Title and Info Bar */}
          <div className="flex flex-col">
            <h4 className=" font-bold">{banknote.denomination}</h4>

            {/* Info Bar */}
            <div className="mt-1 px-0   flex flex-wrap gap-2 items-center text-sm">
              {banknote.extendedPickNumber && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground border border-gray-300">
                  {banknote.extendedPickNumber}
                </Badge>
              )}
              {banknote.pickNumber && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground border border-gray-300">
                  {banknote.turkCatalogNumber}
                </Badge>
              )}
              {banknote.year && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground border border-gray-300">
                  {banknote.year}
                </Badge>
              )}
              {banknote.rarity && (
                <Badge variant="secondary" className="bg-red-100 text-red-800 border border-gray-300 hover:bg-red-200">
                  {banknote.rarity}
                </Badge>
              )}
            </div>
          </div>

          {/* Right Section: Button */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
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
        <div className="p-3 bg-background border-t">
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
