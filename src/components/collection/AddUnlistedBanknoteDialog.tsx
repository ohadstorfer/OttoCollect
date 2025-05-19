
import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { addUnlistedBanknoteAndCollectionItem } from "@/services/collectionService";

interface AddUnlistedBanknoteDialogProps {
  userId: string;
  countryName: string;
  onCreated?: () => void;
}

export const AddUnlistedBanknoteDialog: React.FC<AddUnlistedBanknoteDialogProps> = ({
  userId,
  countryName,
  onCreated,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    denomination: "",
    year: "",
    series: "",
    pickNumber: "",
    extPickNumber: "",
    turkCatalogNumber: "",
    sultanName: "",
    type: "",
    category: "",
    rarity: "",
    sealNames: "",
    faceValue: "",
    obverseImage: "",
    reverseImage: "",
    additionalNotes: "",
  });
  const [loading, setLoading] = useState(false);

  function handleFieldChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!form.denomination || !form.year) {
      toast({
        title: "Error",
        description: "Denomination and Year are required.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const ok = await addUnlistedBanknoteAndCollectionItem({
        userId,
        country: countryName,
        ...form,
      });
      if (ok) {
        toast({
          title: "Success",
          description: "Unlisted banknote added to your collection.",
        });
        setOpen(false);
        setForm({
          denomination: "",
          year: "",
          series: "",
          pickNumber: "",
          extPickNumber: "",
          turkCatalogNumber: "",
          sultanName: "",
          type: "",
          category: "",
          rarity: "",
          sealNames: "",
          faceValue: "",
          obverseImage: "",
          reverseImage: "",
          additionalNotes: "",
        });
        if (onCreated) onCreated();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to add unlisted banknote.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Add an Unlisted Banknote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Unlisted Banknote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            name="denomination"
            placeholder="Denomination"
            value={form.denomination}
            onChange={handleFieldChange}
            required
          />
          <Input
            name="year"
            placeholder="Year"
            value={form.year}
            onChange={handleFieldChange}
            required
          />
          <Input
            name="series"
            placeholder="Series"
            value={form.series}
            onChange={handleFieldChange}
          />
          <Input
            name="pickNumber"
            placeholder="Pick Number"
            value={form.pickNumber}
            onChange={handleFieldChange}
          />
          <Input
            name="extPickNumber"
            placeholder="Extended Pick Number"
            value={form.extPickNumber}
            onChange={handleFieldChange}
          />
          <Input
            name="turkCatalogNumber"
            placeholder="Turk Catalog Number"
            value={form.turkCatalogNumber}
            onChange={handleFieldChange}
          />
          <Input
            name="sultanName"
            placeholder="Sultan Name"
            value={form.sultanName}
            onChange={handleFieldChange}
          />
          <Input
            name="type"
            placeholder="Type"
            value={form.type}
            onChange={handleFieldChange}
          />
          <Input
            name="category"
            placeholder="Category"
            value={form.category}
            onChange={handleFieldChange}
          />
          <Input
            name="rarity"
            placeholder="Rarity"
            value={form.rarity}
            onChange={handleFieldChange}
          />
          <Input
            name="sealNames"
            placeholder="Seal Names"
            value={form.sealNames}
            onChange={handleFieldChange}
          />
          <Input
            name="faceValue"
            placeholder="Face Value"
            value={form.faceValue}
            onChange={handleFieldChange}
          />
          <Input
            name="obverseImage"
            placeholder="Obverse Image URL"
            value={form.obverseImage}
            onChange={handleFieldChange}
          />
          <Input
            name="reverseImage"
            placeholder="Reverse Image URL"
            value={form.reverseImage}
            onChange={handleFieldChange}
          />
          <Input
            name="additionalNotes"
            placeholder="Notes"
            value={form.additionalNotes}
            onChange={handleFieldChange}
          />
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Banknote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

