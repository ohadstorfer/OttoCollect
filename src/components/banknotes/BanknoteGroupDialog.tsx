
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DetailedBanknote } from '@/types';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import BanknoteDetailCard from './BanknoteDetailCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BanknoteGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupBaseNumber: string;
  banknotes: DetailedBanknote[];
  viewMode?: 'grid' | 'list';
}

export const BanknoteGroupDialog: React.FC<BanknoteGroupDialogProps> = ({
  isOpen,
  onClose,
  groupBaseNumber,
  banknotes,
  viewMode = 'grid'
}) => {
  // Display the banknotes grouped by the base pick number
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold">
            Banknote Group: <span className="text-primary">{groupBaseNumber}</span>
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {banknotes.map((banknote, index) => (
                <BanknoteDetailCard
                  key={`grid-banknote-${banknote.id || index}`}
                  banknote={banknote}
                  source="catalog"
                  viewMode={viewMode}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-4">
              {banknotes.map((banknote, index) => (
                <BanknoteDetailCard
                  key={`list-banknote-${banknote.id || index}`}
                  banknote={banknote}
                  source="catalog"
                  viewMode="list"
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
