
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface UnlistedBanknoteDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  countryName: string;
  countryId: string;
  onAdded?: () => void;
}

export const UnlistedBanknoteDialog: React.FC<UnlistedBanknoteDialogProps> = ({
  open,
  onClose,
  userId,
  countryName,
  countryId,
  onAdded,
}) => {
  const [fields, setFields] = useState({
    country: countryName || "",
    extended_pick_number: "",
    pick_number: "",
    face_value: "",
    gregorian_year: "",
    sultan_name: "",
    type: "",
    category: "",
    banknote_description: "",
    notes: "",
    obverse_image: "",
    reverse_image: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // 1. Create the unlisted_banknotes row
    const { data: unlisted, error: unlistedError } = await supabase
      .from("unlisted_banknotes")
      .insert([
        {
          user_id: userId,
          country: fields.country,
          extended_pick_number: fields.extended_pick_number,
          pick_number: fields.pick_number,
          face_value: fields.face_value,
          gregorian_year: fields.gregorian_year,
          sultan_name: fields.sultan_name,
          type: fields.type,
          category: fields.category,
          banknote_description: fields.banknote_description,
          obverse_image: fields.obverse_image || null,
          back_picture: fields.reverse_image || null,
        },
      ])
      .select("id")
      .single();

    if (unlistedError || !unlisted) {
      setErrorMsg("Failed to create unlisted banknote.");
      setLoading(false);
      return;
    }

    // 2. Create the collection_items row
    const { error: collectionError } = await supabase
      .from("collection_items")
      .insert([
        {
          user_id: userId,
          banknote_id: null,
          unlisted_banknotes_id: unlisted.id,
        },
      ]);

    if (collectionError) {
      setErrorMsg("Banknote added, but failed to add to your collection.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (onAdded) onAdded();
    onClose();
    // Optionally: show a toast here.
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Add Unlisted Banknote</DialogTitle>
        <form className="space-y-2 py-2" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <Input
              name="country"
              value={fields.country}
              onChange={handleFieldChange}
              disabled
              className="col-span-2"
              placeholder="Country"
            />
            <Input
              name="extended_pick_number"
              value={fields.extended_pick_number}
              onChange={handleFieldChange}
              placeholder="Extended Pick Number"
              required
            />
            <Input
              name="pick_number"
              value={fields.pick_number}
              onChange={handleFieldChange}
              placeholder="Pick Number"
            />
            <Input
              name="face_value"
              value={fields.face_value}
              onChange={handleFieldChange}
              placeholder="Face Value"
              required
            />
            <Input
              name="gregorian_year"
              value={fields.gregorian_year}
              onChange={handleFieldChange}
              placeholder="Year"
            />
            <Input
              name="sultan_name"
              value={fields.sultan_name}
              onChange={handleFieldChange}
              placeholder="Sultan Name"
            />
            <Input
              name="type"
              value={fields.type}
              onChange={handleFieldChange}
              placeholder="Type"
            />
            <Input
              name="category"
              value={fields.category}
              onChange={handleFieldChange}
              placeholder="Category"
            />
            <Input
              name="obverse_image"
              value={fields.obverse_image}
              onChange={handleFieldChange}
              placeholder="Obverse Image URL"
              className="col-span-2"
            />
            <Input
              name="reverse_image"
              value={fields.reverse_image}
              onChange={handleFieldChange}
              placeholder="Reverse Image URL"
              className="col-span-2"
            />
          </div>
          <Textarea
            name="banknote_description"
            value={fields.banknote_description}
            onChange={handleFieldChange}
            placeholder="Banknote Description"
          />
          {/* Error message */}
          {errorMsg && (
            <div className="text-red-500 pb-1">{errorMsg}</div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Create Unlisted Banknote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnlistedBanknoteDialog;

