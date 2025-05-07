
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";

interface AddBanknoteToCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  banknoteId: string;
}

export const AddBanknoteToCollectionDialog: React.FC<AddBanknoteToCollectionDialogProps> = ({
  isOpen,
  onClose,
  banknoteId,
}) => {
  const { user } = useAuth();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Add this banknote to your collection.
          </p>
          
          {/* Simple placeholder UI */}
          <div className="space-y-4">
            <div className="p-4 border rounded-md">
              <p className="text-sm font-medium">Banknote ID: {banknoteId}</p>
              <p className="text-sm text-muted-foreground mt-2">
                User: {user?.id || "Not logged in"}
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Add functionality would go here
                onClose();
              }}>
                Add to Collection
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
