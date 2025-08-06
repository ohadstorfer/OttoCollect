import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BanknoteDetailCardWishList from "./BanknoteDetailCardWishList";
import { cn } from "@/lib/utils";

export interface BanknoteDetailCardGroupDialogWishListProps {
  isOpen: boolean;
  onClose: () => void;
  groupBaseNumber: string;
  wishlistItems: any[]; // Wishlist items mapped to collection-like structure
  viewMode?: "grid" | "list";
  countryId?: string;
  sultanName?: string;
  onUpdate: () => Promise<void>;
}

export const BanknoteDetailCardGroupDialogWishList: React.FC<BanknoteDetailCardGroupDialogWishListProps> = ({
  isOpen,
  onClose,
  groupBaseNumber,
  wishlistItems,
  viewMode = "grid",
  countryId,
  sultanName,
  onUpdate
}) => {
  // Safety check for empty wishlistItems array
  if (!wishlistItems || wishlistItems.length === 0) {
    return null;
  }
  
  // Get sultan name from first item if not provided
  const displaySultan = sultanName || wishlistItems[0]?.sultanName;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-background flex flex-row items-center justify-between border-b">
          <div className="flex flex-col">
            <DialogTitle>Wishlist Group: {groupBaseNumber}</DialogTitle>
            {displaySultan && (
              <div className="text-sm text-muted-foreground mt-1">
                Sultan: {displaySultan}
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            : "flex flex-col space-y-4"
        )}>
          {wishlistItems.map((item) => (
            <BanknoteDetailCardWishList
              key={`wishlist-${item.wishlistItemId || item.id}`}
              banknote={item.banknote || item}
              viewMode={viewMode}
              countryId={countryId}
              wishlistItemId={item.wishlistItemId}
              source="catalog"
              onDeleted={() => onUpdate()}
              refetchWishlist={() => onUpdate()}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 