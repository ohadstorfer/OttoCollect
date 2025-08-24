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
import { useTranslation } from 'react-i18next';

export interface BanknoteGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupBaseNumber: string;
  banknotes: DetailedBanknote[];
  viewMode?: "grid" | "list";
  countryId?: string;
  sultanName?: string;
}

export const BanknoteGroupDialog: React.FC<BanknoteGroupDialogProps> = ({
  isOpen,
  onClose,
  groupBaseNumber,
  banknotes,
  viewMode = "grid",
  countryId,
  sultanName
}) => {
  const { t } = useTranslation(['catalog']);
  
  // Helper function for translations with fallback
  const tWithFallback = (key: string, fallback: string) => {
    const translation = t(key);
    return translation === key ? fallback : translation;
  };

  // Safety check for empty banknotes array
  if (!banknotes || banknotes.length === 0) {
    return null;
  }
  
  // Get sultan name from first banknote if not provided
  const displaySultan = sultanName || banknotes[0]?.sultanName;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[85vh] overflow-y-auto">
      <DialogHeader className="sticky top-0 z-10 bg-background flex flex-row items-center justify-between border-b">
          <div className="flex flex-col">
            <DialogTitle><span>{tWithFallback('banknoteGroup', 'Banknote Group')}: {groupBaseNumber}</span></DialogTitle>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-start"
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
