
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToWishlist, removeFromWishlist } from '@/services/wishlistService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import BanknoteImageGallery from './BanknoteImageGallery';
import { DetailedBanknote } from '@/types';

interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  showActions?: boolean;
  isInWishlist?: boolean;
  onWishlistChange?: () => void;
}

const BanknoteDetailCard = ({ 
  banknote, 
  showActions = true, 
  isInWishlist = false,
  onWishlistChange 
}: BanknoteDetailCardProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [inWishlist, setInWishlist] = useState(isInWishlist);

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error("You must be logged in to add items to your wishlist.");
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        // Remove from wishlist
        await removeFromWishlist(user.id, banknote.id);
        toast.success("Removed from wishlist");
        setInWishlist(false);
      } else {
        // Add to wishlist
        await addToWishlist(user.id, banknote.id);
        toast.success("Added to wishlist");
        setInWishlist(true);
      }

      // Notify parent component if callback provided
      if (onWishlistChange) {
        onWishlistChange();
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  };

  // Format catalog ID for display
  const formatCatalogId = () => {
    if (banknote.catalogId && banknote.catalogId.startsWith('P')) {
      return banknote.catalogId;
    }
    return `P${banknote.catalogId}`;
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">
              {banknote.denomination}
            </h3>
            <p className="text-sm text-muted-foreground">
              {banknote.country}, {banknote.year}
            </p>
            {banknote.pick_number && (
              <p className="text-sm text-muted-foreground">
                Pick: {banknote.pick_number}
              </p>
            )}
            {banknote.turkCatalogNumber && (
              <p className="text-sm text-muted-foreground">
                Turk Catalog: {banknote.turkCatalogNumber}
              </p>
            )}
            {banknote.sealNames && (
              <p className="text-sm text-muted-foreground">
                Seals: {banknote.sealNames}
              </p>
            )}
            {banknote.sultanName && (
              <p className="text-sm text-muted-foreground">
                Sultan: {banknote.sultanName}
              </p>
            )}
          </div>
          {showActions && user && (
            <Button 
              variant={inWishlist ? "outline" : "default"} 
              size="sm"
              onClick={handleToggleWishlist}
              disabled={loading}
            >
              {inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <BanknoteImageGallery images={banknote.imageUrls} />
        
        <div className="p-4">
          <h4 className="font-semibold">Description</h4>
          <p className="text-sm mb-4">{banknote.description}</p>
          
          {banknote.obverseDescription && (
            <>
              <h4 className="font-semibold">Obverse Details</h4>
              <p className="text-sm mb-2">{banknote.obverseDescription}</p>
            </>
          )}
          
          {banknote.reverseDescription && (
            <>
              <h4 className="font-semibold">Reverse Details</h4>
              <p className="text-sm">{banknote.reverseDescription}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BanknoteDetailCard;
