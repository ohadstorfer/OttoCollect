
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardStack } from "@/components/ui/card-stack";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { LayoutList } from "lucide-react";
import { CollectionItem } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

export interface CollectionItemCardGroupProps {
  group: {
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  };
  onClick?: (group: {
    baseNumber: string;
    items: CollectionItem[];
    count: number;
  }) => void;
  className?: string;
}

export const CollectionItemCardGroup: React.FC<CollectionItemCardGroupProps> = ({
  group,
  onClick,
  className,
}) => {
  const { baseNumber, items, count } = group;

  // Use the first collection item for display information (for group-level badges)
  const firstItem = items[0];
  const denomination = firstItem.banknote ? firstItem.banknote.denomination || '' : '';

  const handleClick = () => {
    if (onClick) onClick(group);
  };

  // Generate stack items for up to 4 items in the group
  const stackItems = items.slice(0, 4).map((item, index) => {
    // Determine the image per item: prefer obverseImage, fallback to banknote imageUrls[0], then placeholder
    let imageUrl: string | null = null;
    if (item.obverseImage) {
      imageUrl = item.obverseImage;
    } else if (item.banknote && item.banknote.imageUrls && Array.isArray(item.banknote.imageUrls) && item.banknote.imageUrls[0]) {
      imageUrl = item.banknote.imageUrls[0];
    } else if (item.banknote && typeof item.banknote.imageUrls === 'string') {
      imageUrl = item.banknote.imageUrls;
    } else {
      imageUrl = null;
    }

    return {
      // Create a unique key using both the item ID and the index
      id: `${item.id}-stack-${index}`,
      content: (
        <Card className="w-full h-full shadow-md overflow-hidden">
          <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold">{item.banknote?.denomination || 'Unknown'}</h4>
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
              {item.condition && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight ml-1">
                  {item.condition}
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
                    alt={`Collection Item ${item.banknote?.extendedPickNumber || ''}`}
                    className="w-full h-full object-cover"
                  />
                </AspectRatio>
              ) : (
                <AspectRatio ratio={4 / 2}>
                  <img
                    src={'/placeholder.svg'}
                    alt="No image available"
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
};
