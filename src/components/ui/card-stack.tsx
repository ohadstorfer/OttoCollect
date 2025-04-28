
import React from "react";
import { cn } from "@/lib/utils";

export interface CardStackItem {
  id: string;
  content: React.ReactNode;
}

export interface CardStackProps {
  items: CardStackItem[];
  className?: string;
  offset?: number;
  scaleFactor?: number;
}

export const CardStack: React.FC<CardStackProps> = ({
  items,
  className,
  offset = 4,
  scaleFactor = 0.02,
}) => {
  if (!items.length) return null;

  // Calculate total height needed based on number of items and offset
  const stackHeight = items.length > 1 ? 
    (items.length - 1) * offset + 100 : // 100 is base card height percentage
    100;

  return (
    <div 
      className={cn("relative w-full", className)}
      style={{ 
        // Set a specific height to contain all stacked items
        paddingBottom: `${stackHeight}%`,
      }}
    >
      {items.map((card, index) => {
        // Only show top 3 cards for performance
        if (index > 3) return null;
        
        const zIndex = items.length - index;
        const top = index * offset;
        const scale = 1 - index * scaleFactor;
        
        return (
          <div
            key={card.id}
            className="absolute transition-all duration-300"
            style={{
              zIndex,
              top: `${top}%`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: "100%",
            }}
          >
            {card.content}
          </div>
        );
      })}
    </div>
  );
};
