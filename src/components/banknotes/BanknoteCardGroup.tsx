
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
}

export const BanknoteCardGroup: React.FC<BanknoteCardGroupProps> = ({
  group,
  onClick,
  className,
}) => {
  const { baseNumber, items, count } = group;
  
  // Use the first banknote for display information
  const firstBanknote = items[0];
  const imageUrl = firstBanknote.imageUrls?.[0] || '';
  const denomination = firstBanknote.denomination || '';
  
  const handleClick = () => {
    if (onClick) onClick(group);
  };
  
  // Generate stack items
  const stackItems = items.slice(0, 4).map((banknote, index) => ({
    id: banknote.id || `stack-item-${index}`,
    content: (
      <Card className="w-full h-full shadow-md overflow-hidden">
        <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
          <div className="flex justify-between items-start">
            <h4 className="font-bold">{banknote.denomination}</h4>
          </div>

          <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm">
            {banknote.extendedPickNumber && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                {banknote.extendedPickNumber}
              </Badge>
            )}
          </div>
        </div>
          
        <CardContent className="p-0">
          <div className="w-full">
            {banknote.imageUrls?.[0] ? (
              <AspectRatio ratio={4/2}>
                <img 
                  src={banknote.imageUrls[0]} 
                  alt={`Banknote ${banknote.extendedPickNumber}`}
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            ) : (
              <AspectRatio ratio={4/2}>
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
      {/* Added proper height and margin to the container to prevent overflow issues */}
      <div className="mb-2 h-[180px] relative">
        <CardStack items={stackItems} offset={6} />
      </div>
      
      <div className="bg-card border rounded-md p-3 shadow-sm transition-shadow group-hover:shadow-md mt-auto">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-lg">{baseNumber}</div>
          <div className="flex items-center text-sm text-muted-foreground">
            <LayoutList className="h-4 w-4 mr-1" />
            <span>{count}</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground truncate">{denomination}</div>
      </div>
    </div>
  );
};
