import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { Dialog, DialogContentWithScroll } from "@/components/ui/dialog";
import CollectionItemForm from '../collection/CollectionItemForm';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { userHasBanknoteInCollection } from "@/utils/userBanknoteHelpers";
import { addToCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { AuthRequiredDialog } from "@/components/auth/AuthRequiredDialog";

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

  // Toast window state: track shown toast's ID to programmatically dismiss it
  const toastIdRef = useRef<string | null>(null);
  const addBtnEventRef = useRef<React.MouseEvent | null>(null);

  // Track if this banknote was just added for optimistic UI update
  const [hasJustBeenAdded, setHasJustBeenAdded] = useState(false);
  const [showOwnershipToast, setShowOwnershipToast] = useState(false);

  // --- Debug logs: input props ---
  console.log('[BanknoteDetailCard] banknote:', banknote);
  console.log('[BanknoteDetailCard] userCollection:', userCollection);

  // Only care about ownership when viewing from catalog
  const ownsThisBanknote =
    source === "catalog" && userHasBanknoteInCollection(banknote, userCollection);

  // --- Debug logs: ownership decision ---
  console.log(
    '[BanknoteDetailCard] source:', source,
    '| result of userHasBanknoteInCollection:', userHasBanknoteInCollection(banknote, userCollection),
    '| ownsThisBanknote:', ownsThisBanknote,
    '| banknote id:', banknote?.id
  );

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

  // stylings for the modern dark green check button
  const checkButtonClass = cn(
    "h-8 w-8 shrink-0",
    "rounded-full border border-green-900 bg-gradient-to-br from-green-900 via-green-800 to-green-950",
    "text-green-200 hover:bg-green-900 hover:shadow-lg transition-all duration-200",
    "shadow-lg"
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
            "overflow-hidden transition-all duration-300 cursor-pointer bg-card",
            isHovering ? "shadow-lg" : ""
          )}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onClick={handleCardClick}
        >
          <div className="flex items-center p-1 ml-1">
            {/* Image container - showing both front and back */}
            <div className="flex-shrink-0 flex items-center space-x-1">
              {/* Front image */}
              <div className="w-[68px] h-[58px] overflow-hidden rounded bg-muted">
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
              <div className="w-[68px] h-[58px] overflow-hidden rounded bg-muted">
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

            <div className="flex-1 ml-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-small text-sm">
                    {banknote.denomination}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {banknote.year}
                  </div>
                </div>
                {source === 'catalog' && (
                  <div>
                    {shouldShowCheck ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={checkButtonClass}
                        onClick={handleOwnershipCheckButton}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={handleAddButtonClick}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm mb-1">
                {banknote.extendedPickNumber && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {banknote.extendedPickNumber}
                  </Badge>
                )}
                {banknote.turkCatalogNumber && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {banknote.turkCatalogNumber}
                  </Badge>
                )}
                {banknote.year && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                    {banknote.year}
                  </Badge>
                )}
                {banknote.rarity && (
                  <Badge
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
              <h4 className="font-bold">{banknote.denomination}</h4>
              {shouldShowCheck ? (
                <>
                  {console.log('[BanknoteDetailCard] RENDERING DARK CHECK BUTTON (grid view) | banknote id:', banknote.id)}
                  <Button
                    variant="secondary"
                    size="icon"
                    className={checkButtonClass}
                    aria-label="You already own this banknote"
                    onClick={handleOwnershipCheckButton}
                    tabIndex={0}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  {console.log('[BanknoteDetailCard] RENDERING PLUS BUTTON (grid view) | banknote id:', banknote.id)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleAddButtonClick}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="gap-0.5 sm:gap-1.5 sm:px-0 flex flex-wrap items-center text-sm">
              {banknote.extendedPickNumber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.extendedPickNumber}
                </Badge>
              )}
              {banknote.turkCatalogNumber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.turkCatalogNumber}
                </Badge>
              )}
              {banknote.year && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground border border-gray-300 shrink-0">
                  {banknote.year}
                </Badge>
              )}
              {banknote.rarity && (
                <Badge
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
