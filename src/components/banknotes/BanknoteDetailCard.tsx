import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Banknote, CollectionItem, DetailedBanknote, BanknoteCondition } from "@/types";
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Check, Star, StarOff, ShoppingCart, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addToCollection, removeFromCollection } from "@/services/collectionService";
import { addToWishlist, removeFromWishlist } from "@/services/wishlistService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addItemToMarketplace, removeItemFromMarketplace } from "@/services/marketplaceService";

interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  collectionItem?: CollectionItem;
  wishlistItem?: boolean;
  source?: 'catalog' | 'collection' | 'missing';
  ownerId?: string;
}

const BanknoteDetailCard = ({ banknote, collectionItem, wishlistItem, source = 'catalog', ownerId }: BanknoteDetailCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToMarketplace, setIsAddingToMarketplace] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [condition, setCondition] = useState<BanknoteCondition>("UNC");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to your collection.",
        variant: "destructive",
      });
      return;
    }

    setIsDialogOpen(true);
  };

  const handleSubmitAddToCollection = async () => {
    if (!user) return;

    setIsAddingToCollection(true);
    try {
      const result = await addToCollection({
        userId: user.id,
        banknoteId: banknote.id,
        condition,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchaseDate: purchaseDate || undefined,
        publicNote: publicNote || undefined,
        privateNote: privateNote || undefined,
        salePrice: salePrice ? parseFloat(salePrice) : undefined,
        isForSale: !!salePrice,
      });

      if (result) {
        toast({
          title: "Success",
          description: "Banknote added to your collection.",
        });
        setIsDialogOpen(false);

        if (salePrice && parseFloat(salePrice) > 0) {
          await addItemToMarketplace(result.id, user.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to add banknote to your collection.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleRemoveFromCollection = async () => {
    if (!user || !collectionItem) return;

    try {
      const result = await removeFromCollection(collectionItem.id);
      if (result) {
        toast({
          title: "Success",
          description: "Banknote removed from your collection.",
        });

        if (collectionItem.isForSale) {
          await removeItemFromMarketplace(collectionItem.id);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to remove banknote from your collection.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing from collection:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your wishlist.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingToWishlist(true);
    try {
      if (wishlistItem) {
        const result = await removeFromWishlist(user.id, banknote.id);
        if (result) {
          toast({
            title: "Success",
            description: "Banknote removed from your wishlist.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to remove from wishlist.",
            variant: "destructive",
          });
        }
      } else {
        const result = await addToWishlist(user.id, banknote.id);
        if (result) {
          toast({
            title: "Success",
            description: "Banknote added to your wishlist.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to add to wishlist.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleToggleMarketplace = async () => {
    if (!user || !collectionItem) return;

    setIsAddingToMarketplace(true);
    try {
      if (collectionItem.isForSale) {
        const result = await removeItemFromMarketplace(collectionItem.id);
        if (result) {
          toast({
            title: "Success",
            description: "Banknote removed from marketplace.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to remove from marketplace.",
            variant: "destructive",
          });
        }
      } else {
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error toggling marketplace:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToMarketplace(false);
    }
  };

  const handleEditCollectionItem = () => {
    navigate(`/banknote/${banknote.id}`, { state: { source: 'collection', itemId: collectionItem?.id } });
  };

  const displayImage = collectionItem?.obverseImage ||
    (banknote.imageUrls && banknote.imageUrls.length > 0
      ? banknote.imageUrls[0]
      : '/placeholder.svg');
  
  const handleCardClick = () => {
    if (source === 'catalog') {
      navigate(`/catalog-banknote/${banknote.id}`);
    } else if (source === 'collection') {
      navigate(`/collection-banknote/${banknote.id}`);
    } else {
      navigate(`/banknote/${banknote.id}`, { state: { source, itemId: collectionItem?.id } });
    }
  };

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 cursor-pointer",
          isHovering ? "shadow-lg" : ""
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleCardClick}
      >
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCollection();
                }}
                disabled={isAddingToCollection || !!collectionItem}
              >
                {collectionItem ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Owned
                  </>
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              displayImage == "/placeholder.svg"
                ? "aspect-[4/2]"
                : "aspect-[4/3]",
              "overflow-hidden"
            )}
          >
            <img
              src={displayImage}
              alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                isHovering ? "scale-110" : "scale-100"
              )}
            />
          </div>

          {collectionItem?.isForSale && (
            <div className="absolute top-0 left-0 bg-green-600/90 text-white px-2 py-1 text-xs font-medium">
              For Sale: ${collectionItem.salePrice}
            </div>
          )}
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {banknote.denomination}
              </h3>
              <p className="text-sm text-muted-foreground">
                {banknote.country} · {banknote.year}
              </p>
            </div>

            {collectionItem && (
              <Badge variant="secondary" className="self-start">
                {collectionItem.condition}
              </Badge>
            )}
          </div>

          <div className="mt-3 p-3 bg-muted/40 rounded-md">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {banknote.pickNumber && (
                <>
                  <dt className="font-medium text-foreground">Pick #</dt>
                  <dd>{banknote.pickNumber}</dd>
                </>
              )}
              {banknote.sultanName && (
                <>
                  <dt className="font-medium text-foreground">Sultan</dt>
                  <dd>{banknote.sultanName}</dd>
                </>
              )}
              {banknote.sealNames && (
                <>
                  <dt className="font-medium text-foreground">Seal Names</dt>
                  <dd>{banknote.sealNames}</dd>
                </>
              )}
              {banknote.rarity && (
                <>
                  <dt className="font-medium text-foreground">Rarity</dt>
                  <dd>{banknote.rarity}</dd>
                </>
              )}
            </dl>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {collectionItem ? "Sell Banknote" : "Add to Collection"}
            </DialogTitle>
            <DialogDescription>
              {collectionItem
                ? "Set a price to list this banknote for sale in the marketplace."
                : "Enter details about this banknote in your collection."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!collectionItem && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={condition}
                      onValueChange={(value: BanknoteCondition) => setCondition(value)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UNC">UNC</SelectItem>
                        <SelectItem value="AU">AU</SelectItem>
                        <SelectItem value="XF">XF</SelectItem>
                        <SelectItem value="VF">VF</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="VG">VG</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="purchasePrice">Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="publicNote">Public Note</Label>
                  <Textarea
                    id="publicNote"
                    value={publicNote}
                    onChange={(e) => setPublicNote(e.target.value)}
                    placeholder="Visible to other users (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="privateNote">Private Note</Label>
                  <Textarea
                    id="privateNote"
                    value={privateNote}
                    onChange={(e) => setPrivateNote(e.target.value)}
                    placeholder="Only visible to you (optional)"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="salePrice">Sale Price</Label>
              <Input
                id="salePrice"
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder={collectionItem ? "Enter price to list for sale" : "Optional - list for sale immediately"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={collectionItem ? handleToggleMarketplace : handleSubmitAddToCollection}
              disabled={collectionItem ? !salePrice : isAddingToCollection}
            >
              {collectionItem ? "List for Sale" : "Add to Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BanknoteDetailCard;
