
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { toast } from '@/hooks/use-toast';
import { addToCollection } from '@/services/collectionService';
import { useAuth } from '@/context/AuthContext';

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
  const [isAdding, setIsAdding] = useState(false);

  // Get current user from auth context
  const { user } = useAuth();

  // Toast window state
  const toastIdRef = useRef<string | null>(null);
  const addBtnEventRef = useRef<React.MouseEvent | null>(null);

  const ownsThisBanknote =
    source === "catalog" && userCollection?.some(
      item => item.banknote?.id === banknote.id
    );

  const handleCardClick = () => {
    if (countryId) setNavigatingToDetail(banknote.id);
    if (source === 'catalog') {
      navigate(`/catalog-banknote/${banknote.id}`);
    } else {
      navigate(`/banknote/${banknote.id}`, { state: { source } });
    }
  };

  const getDisplayImage = (): string => {
    if (!banknote) return '/placeholder.svg';
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

  // --- NEW: Fast add to collection handler ---
  const performQuickAdd = async () => {
    if (!user || !user.id) {
      toast({
        title: "Not signed in",
        description: "You must be logged in to add items to your collection.",
        duration: 4000,
        className: "justify-center items-center w-full",
      });
      return;
    }
    setIsAdding(true);
    try {
      await addToCollection({
        userId: user.id,
        banknoteId: banknote.id,
        condition: "VF", // Default to "Very Fine" for speed; can customize as needed
      });
      toast({
        title: "Added!",
        description: "Banknote added to your collection.",
        duration: 3000,
        className: "justify-center items-center w-full",
      });
    } catch (err) {
      toast({
        title: "Failed",
        description: "Could not add banknote to collection.",
        duration: 4000,
        className: "justify-center items-center w-full",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Show confirm toast if already in collection
  const handleOwnershipCheckButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (toastIdRef.current) return;
    addBtnEventRef.current = e;
    const { id: toastId, dismiss } = toast({
      title: "Already in your collection",
      description: "You already have a copy of this banknote on your collection. Do you want to add another copy of it?",
      action: (
        <div className="flex space-x-2">
          <Button
            className="bg-green-800 text-white hover:bg-green-900 rounded shadow"
            onClick={() => {
              dismiss();
              toastIdRef.current = null;
              performQuickAdd();
            }}
            size="sm"
          >
            Yes
          </Button>
          <Button
            variant="outline"
            className="ml-2 rounded border"
            onClick={() => {
              dismiss();
              toastIdRef.current = null;
            }}
            size="sm"
          >
            Cancel
          </Button>
        </div>
      ),
      duration: 7000,
      className: "justify-center items-center w-full"
    });
    toastIdRef.current = toastId;
  };

  // Plus button/Check button always use quick add or toast flow now
  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    performQuickAdd();
  };

  // Modern dark green check button
  const checkButtonClass = cn(
    "h-8 w-8 shrink-0",
    "rounded-full border border-green-900 bg-gradient-to-br from-green-900 via-green-800 to-green-950",
    "text-green-200 hover:bg-green-900 hover:shadow-lg transition-all duration-200",
    "shadow-lg"
  );

  // ------- Render -------
  if (viewMode === 'list') {
    return (
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 cursor-pointer bg-card",
          isHovering ? "shadow-lg" : ""
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleCardClick}
      >
        <div className="flex items-center p-2">
          <div className="w-16 h-16 relative overflow-hidden rounded">
            <img
              src={displayImage}
              alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 ml-4">
            <div className="flex justify-between items-start">
              <h4 className="font-bold">{banknote.denomination}</h4>
              {ownsThisBanknote ? (
                <Button
                  variant="secondary"
                  size="icon"
                  className={checkButtonClass}
                  aria-label="You already own this banknote"
                  onClick={handleOwnershipCheckButton}
                  tabIndex={0}
                  disabled={isAdding}
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleAddButtonClick}
                  disabled={isAdding}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="gap-1.5 flex flex-wrap items-center text-sm mt-1">
              {banknote.extendedPickNumber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground">
                  {banknote.extendedPickNumber}
                </Badge>
              )}
              {banknote.turkCatalogNumber && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground">
                  {banknote.turkCatalogNumber}
                </Badge>
              )}
              {banknote.year && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-muted text-muted-foreground">
                  {banknote.year}
                </Badge>
              )}
              {banknote.rarity && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto leading-tight bg-red-100 text-red-800">
                  {banknote.rarity}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {banknote.sultanName && <span>Sultan: {banknote.sultanName}</span>}
              {banknote.sealNames && <span className="ml-2">Seals: {banknote.sealNames}</span>}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300 cursor-pointer bg-card self-start",
        isHovering ? "shadow-lg" : ""
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleCardClick}
    >
      <div className="relative">
        <div className="pt-2 pr-1 pl-1 pb-4 border-b sm:pr-3 sm:pl-3">
          <div className="flex justify-between items-start">
            <h4 className="font-bold">{banknote.denomination}</h4>
            {ownsThisBanknote ? (
              <Button
                variant="secondary"
                size="icon"
                className={checkButtonClass}
                aria-label="You already own this banknote"
                onClick={handleOwnershipCheckButton}
                tabIndex={0}
                disabled={isAdding}
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddButtonClick}
                disabled={isAdding}
              >
                <Plus className="h-4 w-4" />
              </Button>
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
        <div className={cn(
          displayImage === "/placeholder.svg" ? "aspect-[4/2]" : "aspect-[4/2]",
          "overflow-hidden"
        )}>
          <img
            src={displayImage}
            alt={`${banknote.country} ${banknote.denomination} (${banknote.year})`}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovering ? "scale-110" : "scale-100"
            )}
          />
        </div>
        <div className="p-3 bg-background border-t">
          {banknote.sultanName && (
            <p className="text-xs text-muted-foreground">
              Sultan: {banknote.sultanName}
            </p>
          )}
          {banknote.sealNames && (
            <p className="text-xs text-muted-foreground">
              Seals: {banknote.sealNames}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BanknoteDetailCard;
