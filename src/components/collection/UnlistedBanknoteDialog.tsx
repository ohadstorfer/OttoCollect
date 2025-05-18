
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Define which fields are required for unlisted banknotes
const DEFAULT_UNLISTED_BANKNOTE = {
  country: "",
  extended_pick_number: "",
  pick_number: "",
  face_value: "",
  gregorian_year: "",
  series: "",
  // Add more fields as needed...
};

interface UnlistedBanknoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  countryName: string;
  onBanknoteAdded?: () => void; // callback for parent to refresh
}

export const UnlistedBanknoteDialog: React.FC<UnlistedBanknoteDialogProps> = ({
  open,
  onOpenChange,
  userId,
  countryName,
  onBanknoteAdded
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    ...DEFAULT_UNLISTED_BANKNOTE,
    country: countryName,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Create unlisted_banknotes entry
      const { country, ...rest } = form;
      const { data: newBanknote, error: banknoteError } = await window.supabase
        .from('unlisted_banknotes')
        .insert([{
          user_id: userId,
          country: form.country,
          ...rest
        }])
        .select('*')
        .single();

      if (banknoteError || !newBanknote) {
        throw banknoteError || new Error("Failed to create unlisted banknote.");
      }

      // 2. Create collection_items entry linked to new unlisted_banknotes
      const { data: collectionItem, error: collectionError } = await window.supabase
        .from('collection_items')
        .insert([{
          user_id: userId,
          is_unlisted_banknote: true,
          unlisted_banknotes_id: newBanknote.id
        }])
        .select('*')
        .single();

      if (collectionError || !collectionItem) {
        throw collectionError || new Error("Failed to add to collection.");
      }

      toast({
        title: "Banknote Added!",
        description: "Your new unlisted banknote was added to your collection.",
      });

      setForm({ ...DEFAULT_UNLISTED_BANKNOTE, country: countryName });
      onOpenChange(false);
      if (onBanknoteAdded) onBanknoteAdded();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add banknote.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Unlisted Banknote</DialogTitle>
          <DialogDescription>
            Use this form to add a banknote to your collection that is not yet listed in the catalog.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <Input
            name="country"
            label="Country"
            value={form.country}
            disabled
            className="col-span-2"
          />
          <Input
            name="extended_pick_number"
            label="Extended Pick Number"
            value={form.extended_pick_number}
            onChange={handleInputChange}
            required
          />
          <Input
            name="pick_number"
            label="Pick Number"
            value={form.pick_number}
            onChange={handleInputChange}
          />
          <Input
            name="face_value"
            label="Face Value"
            value={form.face_value}
            onChange={handleInputChange}
            required
          />
          <Input
            name="gregorian_year"
            label="Year"
            value={form.gregorian_year}
            onChange={handleInputChange}
            required
          />
          <Input
            name="series"
            label="Series"
            value={form.series}
            onChange={handleInputChange}
          />
          {/* Add more fields as necessary */}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding..." : "Add Banknote"}
            </Button>
          </DialogFooter>
        </form>
        <DialogClose asChild>
          <Button variant="ghost" className="mt-2">Cancel</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default UnlistedBanknoteDialog;
