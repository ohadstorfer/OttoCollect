import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardStack } from "@/components/ui/card-stack";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { LayoutList } from "lucide-react";
import { DetailedBanknote } from "@/types";
import { BanknoteGroupData } from "@/utils/banknoteGrouping";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export interface BanknoteCardGroupProps {
  group: BanknoteGroupData;
  onClick?: (group: BanknoteGroupData) => void;
  className?: string;
  viewMode?: 'grid' | 'list';
}

export const BanknoteCardGroup: React.FC<BanknoteCardGroupProps> = ({
  group,
  onClick,
  className,
  viewMode = 'grid'
}) => {
  const { baseNumber, items, count } = group;

  // Find the first banknote with a valid image
  const displayBanknote = items.find(banknote => 
    banknote.imageUrls?.[0] && banknote.imageUrls[0] !== '/placeholder.svg'
  ) || items[0];

  const imageUrl = displayBanknote.imageUrls?.[0] || '';
  const denomination = displayBanknote.denomination || '';

  const handleClick = () => {
    if (onClick) onClick(group);
  };

  if (viewMode === 'grid') {
    // Generate stack items using the first valid image for all cards
    const stackItems = items.slice(0, 4).map((banknote, index) => ({
      id: banknote.id || `stack-item-${index}`,
      content: (
        <Card className="w-full h-full shadow-md overflow-hidden">
          <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold"><span>{denomination}</span></h4>
              <div className="pt-2 pr-1 flex items-center text-sm">
                <span>{count}</span>
                <LayoutList className="h-4 w-4 mr-1" />
              </div>
            </div>

            <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm">
              {baseNumber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {baseNumber}
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="p-0">
            <div className="w-full">
              {imageUrl ? (
                <AspectRatio ratio={4 / 2}>
                  <img
                    src={imageUrl}
                    alt={`Banknote ${displayBanknote.extendedPickNumber}`}
                    className="w-full h-full object-cover"
                  />
                </AspectRatio>
              ) : (
                <AspectRatio ratio={4 / 2}>
                  <img
                    src={'/placeholder.svg'}
                    className="w-full h-full object-cover"
                  />
                </AspectRatio>
              )}
            </div>
          </CardContent>
        </Card>
      ),
    }));

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
        "relative cursor-pointer w-full mb-2",
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
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Banknote ${displayBanknote.extendedPickNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={'/placeholder.svg'}
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
                  <LayoutList className="w-3 h-3 mr-1" />
                  {count}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              {displayBanknote.year}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
