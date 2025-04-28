
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CardStack } from "@/components/ui/card-stack";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Stack } from "lucide-react";
import { DetailedBanknote } from "@/types";
import { BanknoteGroupData } from "@/utils/banknoteGrouping";
import { cn } from "@/lib/utils";

export interface BanknoteCardGroupProps {
  group: BanknoteGroupData;
  onClick?: (group: BanknoteGroupData) => void;
  className?: string;
}

export const BanknoteCardGroup: React.FC<BanknoteCardGroupProps> = ({
  group,
  onClick,
  className,
}) => {
  const { baseNumber, items, count } = group;
  
  // Use the first banknote for display information
  const firstBanknote = items[0];
  const imageUrl = firstBanknote.imageUrls?.[0] || firstBanknote.front_picture || '';
  const denomination = firstBanknote.denomination || firstBanknote.face_value || '';
  
  const handleClick = () => {
    if (onClick) onClick(group);
  };
  
  // Generate stack items
  const stackItems = items.slice(0, 4).map((banknote, index) => ({
    id: banknote.id || `stack-item-${index}`,
    content: (
      <Card className="w-full h-full shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full">
            {banknote.imageUrls?.[0] || banknote.front_picture ? (
              <AspectRatio ratio={3/2}>
                <img 
                  src={banknote.imageUrls?.[0] || banknote.front_picture || ''} 
                  alt={`Banknote ${banknote.extendedPickNumber}`}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            ) : (
              <AspectRatio ratio={3/2}>
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
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
        "group cursor-pointer transition-all",
        className
      )}
      onClick={handleClick}
    >
      <CardStack items={stackItems} offset={6} className="mb-2" />
      
      <div className="bg-card border rounded-md p-3 shadow-sm transition-shadow group-hover:shadow-md">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-lg">{baseNumber}</div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Stack className="h-4 w-4 mr-1" />
            <span>{count}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground truncate">{denomination}</div>
      </div>
    </div>
  );
};
