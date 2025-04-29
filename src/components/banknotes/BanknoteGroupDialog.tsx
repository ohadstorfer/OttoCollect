
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import BanknoteDetailCard from "./BanknoteDetailCard";
import { DetailedBanknote } from "@/types";
import { cn } from "@/lib/utils";

export interface BanknoteGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupBaseNumber: string;
  banknotes: DetailedBanknote[];
  viewMode?: "grid" | "list";
  countryId?: string;
}

export const BanknoteGroupDialog: React.FC<BanknoteGroupDialogProps> = ({
  isOpen,
  onClose,
  groupBaseNumber,
  banknotes,
  viewMode = "grid",
  countryId
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Banknote Group: {groupBaseNumber}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
            : "flex flex-col space-y-4"
        )}>
          {banknotes.map((banknote) => (
            <BanknoteDetailCard
              key={banknote.id}
              banknote={banknote}
              source="catalog"
              viewMode={viewMode}
              countryId={countryId}
              fromGroup={true}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
