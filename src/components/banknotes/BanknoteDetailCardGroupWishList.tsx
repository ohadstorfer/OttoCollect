import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardStack } from "@/components/ui/card-stack";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Layers, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export interface BanknoteDetailCardGroupWishListProps {
  group: {
    baseNumber: string;
    items: any[]; // Wishlist items mapped to collection-like structure
    count: number;
  };
  onClick?: (group: {
    baseNumber: string;
    items: any[];
    count: number;
  }) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
}

export const BanknoteDetailCardGroupWishList: React.FC<BanknoteDetailCardGroupWishListProps> = ({
  group,
  onClick,
  className,
  viewMode = 'grid'
}) => {
  const { baseNumber, items, count } = group;

  // Find the first item with a valid front image
  const displayItem = items.find(item => 
    item.obverseImage && item.obverseImage !== '/placeholder.svg'
  ) || items[0];

  // Fix: Use the exact same image priority logic as BanknoteDetailCardWishList
  const getDisplayImage = (item: any): string => {
    if (!item) return '/placeholder.svg';
    
    // First try to use the thumbnail
    if (item.frontPictureThumbnail) {
      return item.frontPictureThumbnail;
    }
    
    // Then try front_picture
    if (item.front_picture) {
      return item.front_picture;
    }
    
    // Then try imageUrls
    if (Array.isArray(item.imageUrls)) {
      return item.imageUrls.length > 0 ? item.imageUrls[0] : '/placeholder.svg';
    }
    if (typeof item.imageUrls === 'string') {
      return item.imageUrls || '/placeholder.svg';
    }

    return '/placeholder.svg';
  };

  const imageUrl = getDisplayImage(displayItem);
  // Fix: Use the exact same field names that BanknoteDetailCardWishList uses
  const denomination = displayItem?.face_value || '';
  const extendedPickNumber = displayItem?.extended_pick_number || '';
  const year = displayItem?.gregorian_year || '';
  const sultanName = displayItem?.sultanName || '';

  const handleClick = () => {
    if (onClick) onClick(group);
  };

  if (viewMode === 'grid') {
    // Generate stack items using the first valid image for all cards
    const stackItems = items.slice(0, 4).map((item, index) => {
      return {
        // Create a unique key using both the item ID and the index
        id: `${item.id}-stack-${index}`,
        content: (
          <Card className="w-full h-full shadow-md overflow-hidden">
            <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
              <div className="flex justify-between items-start">
                <h4 className="font-bold"><span>{denomination}</span></h4>
                <div className="pt-2 pr-1 flex items-center text-sm">
                  <span>{count}</span>
                  <Layers className="h-4 w-4 mr-1" />
                </div>
              </div>

              <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm">
                {baseNumber && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {baseNumber}
                  </Badge>
                )}
                {extendedPickNumber && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {extendedPickNumber}
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-0">
              <div className="w-full">
                {!imageUrl || imageUrl === '/placeholder.svg' ? (
                  <AspectRatio ratio={4 / 3}>
                    <img
                      src={'/placeholder.svg'}
                      className="w-full h-full object-cover"
                    />
                  </AspectRatio>
                ) : (
                  <AspectRatio ratio={4 / 3}>
                    <img
                      src={imageUrl}
                      alt={`Wishlist Item ${extendedPickNumber || ''}`}
                      className="w-full h-full object-cover"
                    />
                  </AspectRatio>
                )}
              </div>
            </CardContent>
          </Card>
        ),
      };
    });

    return (
      <div
        className={cn(
          "group cursor-pointer transition-all flex flex-col",
          className
        )}
        onClick={handleClick}
      >
        <CardStack items={stackItems} offset={6} />
      </div>
    );
  }

  // List view mode
  return (
    <div 
      className={cn(
        "relative cursor-pointer w-full",
        "mb-2",
        "transition-all duration-300",
        className
      )}
      onClick={handleClick}
    >
      {/* Background stacked cards */}
      {Array.from({ length: Math.min(3, count - 1) }).map((_, index) => (
        <Card
          key={`stack-${index}`}
          className={cn(
            "absolute w-full overflow-hidden bg-muted",
            "transition-transform duration-300",
            index === 0 && "translate-y-[2px]",
            index === 1 && "translate-y-[4px]",
            index === 2 && "translate-y-[6px]"
          )}
        >
          <div className="flex items-center p-1 ml-1 w-full h-[70px]" />
        </Card>
      ))}

      {/* Main card */}
      <Card className="relative z-10 overflow-hidden bg-card">
        <div className="flex items-center p-1 ml-1 w-full">
          <div className="flex-shrink-0">
            <div className="h-[58px] w-[68px] relative rounded-md overflow-hidden">
              {!imageUrl || imageUrl === '/placeholder.svg' ? (
                <img
                  src={'/placeholder.svg'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={imageUrl}
                  alt={`Wishlist Item ${extendedPickNumber || ''}`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
          <div className="flex-grow ml-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <span>{denomination}</span>
                {baseNumber && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {baseNumber}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="mr-2">
                  <Layers className="w-3 h-3 mr-1" />
                  {count}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              {year}
              {extendedPickNumber && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight">
                  {extendedPickNumber}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}; 