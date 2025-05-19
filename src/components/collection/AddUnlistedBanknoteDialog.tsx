import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { createUnlistedBanknoteWithCollectionItem } from "@/services/collectionService";

interface AddUnlistedBanknoteDialogProps {
  userId: string;
  countryName: string;
  onCreated?: () => void;
}

const AddUnlistedBanknoteDialog: React.FC<AddUnlistedBanknoteDialogProps> = ({
  userId,
  countryName,
  onCreated,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic");

  const [form, setForm] = useState<any>({
    extended_pick_number: "",
    pick_number: "",
    turk_catalog_number: "",
    face_value: "",
    gregorian_year: "",
    islamic_year: "",
    sultan_name: "",
    printer: "",
    type: "",
    category: "",
    rarity: "",
    banknote_description: "",
    historical_description: "",
    front_picture: "",
    back_picture: "",
    seal_names: "",
    // Add more fields if needed for unlisted
    // Defaults set to blank string for easy controlled components
  });

  const handleFieldChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTabChange = (tab: string) => setActiveTab(tab);

  const resetForm = () => {
    setForm({
      extended_pick_number: "",
      pick_number: "",
      turk_catalog_number: "",
      face_value: "",
      gregorian_year: "",
      islamic_year: "",
      sultan_name: "",
      printer: "",
      type: "",
      category: "",
      rarity: "",
      banknote_description: "",
      historical_description: "",
      front_picture: "",
      back_picture: "",
      seal_names: "",
    });
  };

  // img upload can be added later in refactor.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required field validation
    if (!form.extended_pick_number || !form.face_value) {
      toast({
        title: "Error",
        description: "Catalog ID and Denomination are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await createUnlistedBanknoteWithCollectionItem({
        userId,
        country: countryName,
        ...form,
      });
      if (ok) {
        toast({
          title: "Success",
          description: "Your unlisted banknote was added.",
        });
        setOpen(false);
        resetForm();
        if (onCreated) onCreated();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not add the unlisted banknote.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add an Unlisted Banknote</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Unlisted Banknote</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="details">Additional Details</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extended_pick_number">Catalog ID (required)</Label>
                  <Input
                    id="extended_pick_number"
                    name="extended_pick_number"
                    value={form.extended_pick_number}
                    onChange={handleFieldChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pick_number">Pick Number</Label>
                  <Input
                    id="pick_number"
                    name="pick_number"
                    value={form.pick_number}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="face_value">Denomination (required)</Label>
                  <Input
                    id="face_value"
                    name="face_value"
                    value={form.face_value}
                    onChange={handleFieldChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gregorian_year">Gregorian Year</Label>
                  <Input
                    id="gregorian_year"
                    name="gregorian_year"
                    value={form.gregorian_year}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="islamic_year">Islamic Year</Label>
                  <Input
                    id="islamic_year"
                    name="islamic_year"
                    value={form.islamic_year}
                    onChange={handleFieldChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banknote_description">Description</Label>
                <Textarea
                  id="banknote_description"
                  name="banknote_description"
                  value={form.banknote_description}
                  onChange={handleFieldChange}
                  rows={3}
                />
              </div>
            </TabsContent>
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sultan_name">Sultan Name</Label>
                  <Input
                    id="sultan_name"
                    name="sultan_name"
                    value={form.sultan_name}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printer">Printer</Label>
                  <Input
                    id="printer"
                    name="printer"
                    value={form.printer}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Input
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rarity">Rarity</Label>
                  <Input
                    id="rarity"
                    name="rarity"
                    value={form.rarity}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seaL_names">Seal Names</Label>
                  <Input
                    id="seal_names"
                    name="seal_names"
                    value={form.seal_names}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turk_catalog_number">Turk Catalog Number</Label>
                  <Input
                    id="turk_catalog_number"
                    name="turk_catalog_number"
                    value={form.turk_catalog_number}
                    onChange={handleFieldChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="historical_description">Historical Description</Label>
                <Textarea
                  id="historical_description"
                  name="historical_description"
                  value={form.historical_description}
                  onChange={handleFieldChange}
                  rows={3}
                />
              </div>
            </TabsContent>
            <TabsContent value="images" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="front_picture">Front Image URL</Label>
                    <Input
                      id="front_picture"
                      name="front_picture"
                      value={form.front_picture}
                      onChange={handleFieldChange}
                      placeholder="https://..."
                    />
                  </div>
                  {form.front_picture && (
                    <div className="border rounded p-2">
                      <img
                        src={form.front_picture}
                        alt="Front image"
                        className="w-full h-auto max-h-48 object-contain"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src = '/placeholder.svg')
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="back_picture">Back Image URL</Label>
                    <Input
                      id="back_picture"
                      name="back_picture"
                      value={form.back_picture}
                      onChange={handleFieldChange}
                      placeholder="https://..."
                    />
                  </div>
                  {form.back_picture && (
                    <div className="border rounded p-2">
                      <img
                        src={form.back_picture}
                        alt="Back image"
                        className="w-full h-auto max-h-48 object-contain"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src = '/placeholder.svg')
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Note: For uploading new images, please use the image suggestion workflow. These fields are for setting existing image URLs.
              </p>
            </TabsContent>
          </Tabs>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Banknote"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { AddUnlistedBanknoteDialog };
