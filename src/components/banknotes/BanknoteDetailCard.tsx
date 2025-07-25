import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Eye, Heart, BookCopy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem, UserRank } from "@/types";
import { cn } from "@/lib/utils";
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CollectionItemForm from '../collection/CollectionItemForm';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { userHasBanknoteInCollection } from "@/utils/userBanknoteHelpers";
import { addToCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";
import { addToWishlist, deleteWishlistItem, fetchWishlistItem } from "@/services/wishlistService";
import { getBanknoteCollectors } from "@/services/banknoteService";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/lib/utils";
import UserProfileLink from "@/components/common/UserProfileLink";
import { useWishlist } from "@/context/WishlistContext";

interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  collectionItem?: CollectionItem;
  source?: 'catalog' | 'collection' | 'missing';
  ownerId?: string;
  viewMode?: 'grid' | 'list';
  countryId?: string;
  fromGroup?: boolean;
  userCollection?: CollectionItem[];
}

const BanknoteDetailCard = ({
  banknote,
  source = 'catalog',
  viewMode = 'grid',
  countryId,
  fromGroup = false,
  userCollection = [],
}: BanknoteDetailCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const { setNavigatingToDetail } = useBanknoteDialogState(countryId || '');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  // Use wishlist context instead of individual API calls
  const { isWishlistItem, getWishlistItemId, addToWishlistMap, removeFromWishlistMap } = useWishlist();

  // Toast window state: track shown toast's ID to programmatically dismiss it
  const toastIdRef = useRef<string | null>(null);
  const addBtnEventRef = useRef<React.MouseEvent | null>(null);

  // Track if this banknote was just added for optimistic UI update
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);
  const [showOwnershipToast, setShowOwnershipToast] = useState(false);
  const [showCollectorsDialog, setShowCollectorsDialog] = useState(false);

  // Add collectors query
  const { data: collectorsData, isLoading: collectorsLoading } = useQuery({
    queryKey: ['banknoteCollectors', banknote.id],
    queryFn: () => getBanknoteCollectors(banknote.id),
    enabled: !!banknote.id
  });

  // Only care about ownership when viewing from catalog
  const ownsThisBanknote =
    source === "catalog" && userHasBanknoteInCollection(banknote, userCollection);

  // Get wishlist status from context
  const isInWishlist = isWishlistItem(banknote.id);
  const wishlistItemId = getWishlistItemId(banknote.id);



  const handleCardClick = (e: React.MouseEvent) => {
    if (!user) {
      e.stopPropagation();
      setShowAuthDialog(true);
      return;
    }

    if (countryId) setNavigatingToDetail(banknote.id);
    if (source === 'catalog') {
      navigate(`/catalog-banknote/${banknote.id}`);
    } else {
      navigate(`/banknote/${banknote.id}`, { state: { source } });
    }
  };

  const getDisplayImage = (): string => {
    if (!banknote) return '/placeholder.svg';

    // First try to use the thumbnail
    if (banknote.frontPictureThumbnail) {
      return banknote.frontPictureThumbnail;
    }

    // Fallback to original images
    if (!banknote.imageUrls) return '/placeholder.svg';
    if (Array.isArray(banknote.imageUrls)) {
      return banknote.imageUrls.length > 0 ? banknote.imageUrls[0] : '/placeholder.svg';
    }
    if (typeof banknote.imageUrls === 'string') {
      return banknote.imageUrls || '/placeholder.svg';
    }
    return '/placeholder.svg';
  };

  const displayImage = getDisplayImage();

  // Centralized function to create collection item and show toast
  const createCollectionItem = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !user.id) {
      toast({
        title: "Login required",
        description: "You must be logged in to add banknotes to your collection.",
        variant: "destructive",
      });
      return;
    }
    try {
      const res = await addToCollection({
        userId: user.id,
        banknoteId: banknote.id
        // Only send userId and banknoteId per requirements; condition and others will be added later.
      });
      if (res) {
        setHasJustBeenAdded(true);  // Optimistically update UI
        toast({
          title: "Added to your collection!",
          description: "This banknote was added. Visit your collection to edit its details.",
          className: "justify-center items-center w-full",
          duration: 3000,
        });
      } else {
        throw new Error("Unable to add banknote to collection");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to add this banknote to your collection.",
        variant: "destructive",
        duration: 3500,
      });
    }
  };

  // Modified: Show in-component custom toast on check click, and handle Yes/Cancel logic
  const handleOwnershipCheckButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOwnershipToast(true);
  };

  const handleOwnershipToastYes = (e: React.MouseEvent) => {
    setShowOwnershipToast(false);
    createCollectionItem(e);
  };

  const handleOwnershipToastCancel = () => {
    setShowOwnershipToast(false);
  };

  const handleAddButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    createCollectionItem(e);
  };

  const handleUpdateSuccess = () => {
    setIsAddDialogOpen(false);
    toast({
      title: "Success",
      description: "Banknote added to your collection",
      duration: 2500,
      className: "justify-center items-center w-full",
    });
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    try {
      if (isInWishlist && wishlistItemId) {
        // Remove from wishlist
        const success = await deleteWishlistItem(wishlistItemId);
        if (success) {
          removeFromWishlistMap(banknote.id);
          toast({
            title: "Removed from wishlist",
            description: "The banknote has been removed from your wishlist.",
            duration: 2000,
          });
        }
      } else {
        // Add to wishlist
        const success = await addToWishlist(user.id, banknote.id);
        if (success) {
          // Fetch the new wishlist item to get its ID
          const newItem = await fetchWishlistItem(user.id, banknote.id);
          if (newItem) {
            addToWishlistMap(banknote.id, newItem);
          }
          toast({
            title: "Added to wishlist",
            description: "The banknote has been added to your wishlist.",
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  // stylings for the modern dark green check button
  const checkButtonClass = cn(
    "h-8 w-8 shrink-0",
    "rounded-full border border-green-900 bg-gradient-to-br from-green-900 via-green-800 to-green-950",
    "text-green-200 hover:bg-green-900 hover:shadow-lg transition-all duration-200",
    "shadow-lg"
  );

  // Add wishlist button styles
  const wishlistButtonClass = cn(
    "h-8 w-8 shrink-0",
    "rounded-full",
    isInWishlist
      ? "bg-red-100 text-red-600 hover:bg-red-200 border-red-300"
      : "bg-background hover:bg-muted",
    "transition-all duration-200"
  );

  // --- Use hasJustBeenAdded for immediate UI feedback ---
  const shouldShowCheck = ownsThisBanknote || hasJustBeenAdded;

  // --- Custom Toast Markup, centered top with improved animation ---
  const renderOwnershipToast = () => {
    if (!showOwnershipToast) return null;
    return (
      <div
        className="fixed top-8 left-1/2 z-[200] flex flex-col items-center fade-in-center-top"
        style={{
          transform: "translate(-50%, 0)",
          minWidth: 330,
          maxWidth: "95vw",
          width: 380,
        }}
      >
        <div className="bg-background border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-6 py-4 flex flex-col items-center">
          <div className="font-semibold text-center text-base mb-1">Already in your collection</div>
          <div className="text-muted-foreground text-center text-sm mb-3">
            You already have a copy of this banknote in your collection.<br />
            Do you want to add <strong>another copy</strong> of it?
          </div>
          <div className="flex gap-4 justify-center w-full mt-2">
            <button
              type="button"
              className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded transition-colors focus:outline-none shadow"
              onClick={handleOwnershipToastYes}
              autoFocus
            >
              Yes
            </button>
            <button
              type="button"
              className="bg-muted text-muted-foreground border border-gray-300 hover:bg-gray-200 rounded py-2 px-6 font-medium transition-colors focus:outline-none"
              onClick={handleOwnershipToastCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // IMAGE: fully shown, dynamic height
  const renderBanknoteImage = () => {
    if (displayImage && displayImage !== '/placeholder.svg') {
      return (
        <img
          src={displayImage}
          alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
          className="object-contain w-full h-auto max-h-60"
        />
      );
    } else {
      return (
        <AspectRatio ratio={4 / 2}>
          <img
            src="/placeholder.svg"
            alt="Placeholder"
            className="w-full h-full object-cover"
          />
        </AspectRatio>
      );
    }
  };

  if (viewMode === 'list') {
    return (
      <>
        {renderOwnershipToast()}
        <Card
          className={cn(
            "overflow-hidden transition-all duration-300 cursor-pointer bg-card w-full",
            "hover:shadow-md flex flex-row max-w-full",
            isHovering ? "shadow-lg" : ""
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleCardClick}
        >
          <div className="flex items-center p-1 ml-1 w-full overflow-hidden">
            {/* Image container - showing both front and back */}
            <div className="flex-shrink-0 flex items-center space-x-1">
              {/* Front image */}
              <div className="h-[58px] w-[90px] flex-shrink-0 overflow-hidden rounded">
                {displayImage && displayImage !== '/placeholder.svg' ? (
                  <img
                    src={displayImage}
                    alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) - Front`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src="/placeholder.svg"
                      alt="Placeholder"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Back image */}
              <div className="h-[58px] w-[90px] flex-shrink-0 overflow-hidden rounded">
                {banknote.backPictureThumbnail || (banknote.imageUrls && banknote.imageUrls[1]) ? (
                  <img
                    src={banknote.backPictureThumbnail || banknote.imageUrls[1]}
                    alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) - Back`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src="/placeholder.svg"
                      alt="Placeholder"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 ml-4 min-w-0 overflow-hidden">
              <div className="flex justify-between items-start w-full">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="font-small text-sm truncate">
                    {banknote.denomination}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {banknote.year}
                  </div>
                </div>
                {source === 'catalog' && (
                  <div className="flex-shrink-0 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(wishlistButtonClass, "h-7 w-7")}
                      onClick={handleWishlistClick}
                      title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart className={cn("h-3.5 w-3.5", isInWishlist ? "fill-current" : "")} />
                    </Button>
                    {shouldShowCheck ? (
                      <Button
                        title="You already own this banknote"
                        variant="ghost"
                        size="icon"
                        className={cn(checkButtonClass, "flex-shrink-0 h-7 w-7")}
                        onClick={handleOwnershipCheckButton}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        title="Add to your collection"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0"
                        onClick={handleAddButtonClick}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden sm:flex h-7 items-center gap-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCollectorsDialog(true);
                      }}
                      title={`On ${collectorsData?.total_count || 0} Collections`}
                    >
                      <span className="text-xs font-medium flex items-center gap-0.5">{collectorsData?.total_count || 0}<BookCopy className="h-3.5 w-3.5" /></span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-0.5 gap-0.5 sm:gap-1.5 flex flex-wrap items-center text-sm mb-1 overflow-hidden">
                {banknote.extendedPickNumber && (
                  <Badge title={"Extended Pick Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {banknote.extendedPickNumber}
                  </Badge>
                )}
                {banknote.turkCatalogNumber && (
                  <Badge title={"Turkish Catalog Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {banknote.turkCatalogNumber}
                  </Badge>
                )}
                {banknote.rarity && (
                  <Badge
                    title={"Rarity"}
                    variant="secondary"
                    className="hidden sm:inline text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-red-100 text-red-800 border border-gray-300 hover:bg-red-200 shrink-0"
                  >
                    {banknote.rarity}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      {renderOwnershipToast()}
      <Card
        className="overflow-hidden transition-all hover:shadow-md cursor-pointer hover:scale-[1.01]"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleCardClick}
      >
        <div className="relative">
          <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold"><span>{banknote.denomination}</span></h4>
              <div className="flex gap-0.1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex h-8 items-center px-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCollectorsDialog(true);
                  }}
                  title={`On ${collectorsData?.total_count || 0} Collections`}
                >
                  <span className="text-xs font-medium flex items-center gap-0.5">{collectorsData?.total_count || 0}<BookCopy className="h-4 w-4" /></span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={wishlistButtonClass}
                  onClick={handleWishlistClick}
                  title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={cn("h-4 w-4", isInWishlist ? "fill-current" : "")} />
                </Button>
                {shouldShowCheck ? (
                  <Button
                    title="You already own this banknote"
                    variant="secondary"
                    size="icon"
                    className={checkButtonClass}
                    aria-label="You already own this banknote"
                    onClick={handleOwnershipCheckButton}
                    tabIndex={0}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    title="Add to your collection"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddButtonClick}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm">
              {banknote.extendedPickNumber && (
                <Badge title={"Extended Pick Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.extendedPickNumber}
                </Badge>
              )}
              {banknote.turkCatalogNumber && (
                <Badge title={"Turkish Catalog Number"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.turkCatalogNumber}
                </Badge>
              )}
              {banknote.year && (
                <Badge title={"Year"} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.year}
                </Badge>
              )}
              {banknote.rarity && (
                <Badge
                  title={"Rarity"}
                  variant="secondary"
                  className="hidden sm:inline text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-red-100 text-red-800 border border-gray-300 hover:bg-red-200 shrink-0"
                >
                  {banknote.rarity}
                </Badge>
              )}
            </div>
          </div>

          {/* IMAGE slot */}
          <div className="relative w-full flex justify-center items-center bg-muted ">
            {renderBanknoteImage()}
          </div>

          <div className="p-3 bg-background border-t">
            {banknote?.sultanName && (
              <p className="text-xs text-muted-foreground">
                {banknote.authorityName || "Authority"}: {banknote.sultanName}
              </p>
            )}
            {(banknote.signaturesFront || banknote.signaturesBack) && (
              <p className="text-xs text-muted-foreground">
                Signatures: {banknote.signaturesFront} {banknote.signaturesBack}
              </p>
            )}
            {banknote.sealNames && (
              <p className="text-xs text-muted-foreground">
                Seals: {banknote.sealNames}
              </p>
            )}
            {banknote.securityElement && (
              <p className="text-xs text-muted-foreground">
                {banknote.securityElement}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Add Collectors Dialog */}
      <Dialog open={showCollectorsDialog} onOpenChange={setShowCollectorsDialog}>
        <DialogContent className="max-w-md max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 mt-2">
              <BookCopy className="h-5 w-5" />
              <span>Collectors ({collectorsData?.total_count || 0})</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {collectorsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : collectorsData?.collectors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No collectors yet</p>
              ) : (
                collectorsData?.collectors.map((collector) => (
                  <div key={collector.id} className="flex items-center justify-between">
                    <UserProfileLink
                      userId={collector.id}
                      username={collector.username || 'Unknown'}
                    >
                      <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={collector.avatar_url} />
                          <AvatarFallback>
                            {getInitials(collector.username || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{collector.username || 'Unknown'}</div>
                          {collector.rank && (
                            <Badge variant="user" rank={collector.rank} role={collector.role} showIcon />
                          )}
                        </div>
                      </div>
                    </UserProfileLink>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title="Join Our Community"
        description="Get full access to our extensive Ottoman banknote catalog and collection features."
        features={[
          {
            icon: <Eye className="h-5 w-5 text-ottoman-600 dark:text-ottoman-300" />,
            title: "View Detailed Information",
            description: "Access complete banknote details, high-resolution images, and historical data"
          },
          {
            icon: <Plus className="h-5 w-5 text-ottoman-600 dark:text-ottoman-300" />,
            title: "Build Your Collection",
            description: "Create and manage your personal banknote collection"
          }
        ]}
      />
    </>
  );
};

export default BanknoteDetailCard;
