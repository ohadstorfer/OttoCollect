import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DetailedBanknote, CollectionItem } from "@/types";
import { cn } from "@/lib/utils";
import { useBanknoteDialogState } from '@/hooks/use-banknote-dialog-state';
import { Dialog, DialogContentWithScroll } from "@/components/ui/dialog";
import CollectionItemForm from '../collection/CollectionItemForm';
import { toast } from '@/hooks/use-toast';


interface BanknoteDetailCardProps {
  banknote: DetailedBanknote;
  collectionItem?: CollectionItem;
  source?: 'catalog' | 'collection' | 'missing';
  ownerId?: string;
  viewMode?: 'grid' | 'list';
  countryId?: string;
  fromGroup?: boolean;
}

const BanknoteDetailCard = ({ 
  banknote, 
  source = 'catalog',
  viewMode = 'grid',
  countryId,
  fromGroup = false
}: BanknoteDetailCardProps) => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const { setNavigatingToDetail } = useBanknoteDialogState(countryId || '');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  
  const handleCardClick = () => {
    // Set the navigation flag to know we're coming from a group dialog
    if (countryId) {
      setNavigatingToDetail(banknote.id);
    }
    
    if (source === 'catalog') {
      navigate(`/catalog-banknote/${banknote.id}`);
    } else {
      navigate(`/banknote/${banknote.id}`, { state: { source } });
    }
  };

  // More robust approach to get a valid image URL
  const getDisplayImage = (): string => {
    // Safety check for null banknote
    if (!banknote) return '/placeholder.svg';
    
    // Check if imageUrls exists
    if (!banknote.imageUrls) return '/placeholder.svg';
    
    // Handle array of image URLs
    if (Array.isArray(banknote.imageUrls)) {
      return banknote.imageUrls.length > 0 ? banknote.imageUrls[0] : '/placeholder.svg';
    }
    
    // Handle string imageUrls
    if (typeof banknote.imageUrls === 'string') {
      return banknote.imageUrls || '/placeholder.svg';
    }
    
    return '/placeholder.svg';
  };

  const displayImage = getDisplayImage();

  const handleUpdateSuccess = async () => {
    setIsEditDialogOpen(false);
    toast({
      title: "Success",
      description: "Collection item updated successfully",
    });
  };
  
  // Edit dialog - fixed by properly adding the Dialog component
  return (
    <>
      {viewMode === 'list' ? (
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
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
      ) : (
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
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
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
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContentWithScroll className="sm:max-w-[800px]">
          <CollectionItemForm
            onUpdate={handleUpdateSuccess}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContentWithScroll>
      </Dialog>
    </>
  );
};

export default BanknoteDetailCard;
