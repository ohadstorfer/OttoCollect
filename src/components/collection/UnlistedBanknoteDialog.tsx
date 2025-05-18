import React, { useState } from "react";
import { Dialog, DialogContentWithScroll } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addUnlistedBanknoteAndToCollection } from "@/services/collectionService";
import type { UnlistedBanknote, BanknoteCondition, CollectionItem } from "@/types";

// Only most basic fields, you can expand UI as needed
interface UnlistedBanknoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: (item: CollectionItem) => void;
}

export const UnlistedBanknoteDialog: React.FC<UnlistedBanknoteDialogProps> = ({ open, onOpenChange, userId, onCreated }) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Simple form state, can expand as wanted
  const [country, setCountry] = useState("");
  const [faceValue, setFaceValue] = useState("");
  const [condition, setCondition] = useState<BanknoteCondition>("UNC");
  const [pickNumber, setPickNumber] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Prepare object to match UnlistedBanknote structure
      // Remove 'condition' from unlistedBanknote, only include in collectionParams
      const unlistedBanknoteData = {
        country,
        faceValue,
        extendedPickNumber: pickNumber,
        pickNumber,
        banknoteDescription: note,
      };

      const res = await addUnlistedBanknoteAndToCollection({
        userId,
        unlistedBanknote: unlistedBanknoteData,
        collectionParams: { condition, publicNote: note }
      });

      if (res) {
        toast({ title: "Unlisted banknote added to collection." });
        onCreated(res);
        onOpenChange(false);
      }
    } catch (err) {
      toast({ title: "Error adding unlisted banknote.", description: String(err), variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentWithScroll>
        <div className="space-y-4 w-full">
          <h2 className="font-semibold text-lg">Add Unlisted Banknote</h2>
          <div>
            <label className="block mb-1 font-medium">Country</label>
            <input type="text" className="input" value={country} onChange={e => setCountry(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Face Value</label>
            <input type="text" className="input" value={faceValue} onChange={e => setFaceValue(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Pick Number</label>
            <input type="text" className="input" value={pickNumber} onChange={e => setPickNumber(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-medium">Condition</label>
            <select className="input" value={condition} onChange={e => setCondition(e.target.value as BanknoteCondition)}>
              <option value="UNC">UNC</option>
              <option value="AU">AU</option>
              <option value="XF">XF</option>
              <option value="VF">VF</option>
              <option value="F">F</option>
              <option value="VG">VG</option>
              <option value="G">G</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Notes</label>
            <textarea className="input" value={note} onChange={e => setNote(e.target.value)} rows={3}></textarea>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating..." : "Create Unlisted Banknote"}
            </Button>
          </div>
        </div>
      </DialogContentWithScroll>
    </Dialog>
  );
};

export default UnlistedBanknoteDialog;
