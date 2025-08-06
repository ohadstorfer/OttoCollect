
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CollectionItemCard from "./CollectionItemCard";
import { CollectionItem } from "@/types";
import { cn } from "@/lib/utils";

export interface CollectionItemGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupBaseNumber: string;
  collectionItems: CollectionItem[];
  viewMode?: "grid" | "list";
  countryId?: string;
  sultanName?: string;
  onUpdate: () => Promise<void>;
  isOwner: boolean;
}

export const CollectionItemGroupDialog: React.FC<CollectionItemGroupDialogProps> = ({
  isOpen,
  onClose,
  groupBaseNumber,
  collectionItems,
  viewMode = "grid",
  countryId,
  sultanName,
  onUpdate,
  isOwner
}) => {
  // Safety check for empty collectionItems array
  if (!collectionItems || collectionItems.length === 0) {
    return null;
  }
  
  // Get sultan name from first item if not provided
  const displaySultan = sultanName || (collectionItems[0]?.banknote?.sultanName);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 z-10 bg-background flex flex-row items-center justify-between border-b">
          <div className="flex flex-col">
            <DialogTitle> <span> Collection Group: {groupBaseNumber} </span></DialogTitle>
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
          {collectionItems.map((item) => (
            <CollectionItemCard
              key={item.id}
              item={item}
              onEdit={() => {}} // We'll implement this later
              onUpdate={onUpdate}
              viewMode={viewMode}
              isOwner={isOwner}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
