import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCollectionItem } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import type { CollectionItem as CollectionItemType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogContentWithScroll } from "@/components/ui/dialog";
import { toast } from "sonner";
import CollectionItemForm from "@/components/collection/CollectionItemForm";
import { ArrowLeft, Star, ImagePlus, Edit, Trash, Trash2, Eye, EyeOff, ArrowRight } from "lucide-react";
import BanknoteCollectionDetail from "./BanknoteCollectionDetail";
import { BanknoteProvider } from "@/context/BanknoteContext";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import CollectionItemFormEdit from "@/components/collection/CollectionItemFormEdit";
import { submitImageSuggestion, hasExistingImageSuggestion, deleteExistingImageSuggestions } from "@/services/imageSuggestionsService";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import ImagePreview from "@/components/shared/ImagePreview";
import { useTranslation } from 'react-i18next';
import { useLanguage } from "@/context/LanguageContext";


interface LabelValuePairProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  if (!value) return null;

  return (
    <div className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-right font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center space-x-2">
        {icon && <div className={`text-primary ${iconClassNames}`}>{icon}</div>}
        <span>{value}</span>
      </div>
    </div>
  );
};

export default function CollectionItem() {
  const { t } = useTranslation(['collection']);
  const { currentLanguage } = useLanguage();
  
  // All hooks first!
  const [imageOrientations, setImageOrientations] = useState<Record<number, 'vertical' | 'horizontal'>>({});
  const [itemOwnerRole, setItemOwnerRole] = useState<string | null>(null);
  const [isLoadingOwnerRole, setIsLoadingOwnerRole] = useState(true);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingImages, setIsSubmittingImages] = useState(false);
  const [hasPendingSuggestion, setHasPendingSuggestion] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<'obverse' | 'reverse' | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [imageChangedAfterApproval, setImageChangedAfterApproval] = useState(false);
  const { direction } = useLanguage();


  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Fetch collection item directly by ID
  const { data: collectionItem, isLoading, isError, refetch } = useQuery({
    queryKey: ["collectionItem", id],
    queryFn: () => fetchCollectionItem(id || ""),
    enabled: !!id,
  });

  // Determine if the current user is the owner of this item (define early for use in effects)
  const isOwner = user?.id === collectionItem?.userId;

  // Check if images should be hidden for non-owners
  const shouldHideImages = !isOwner && collectionItem?.hide_images && user?.role !== 'Super Admin';

  // Check if showing private images as admin
  const isShowingPrivateAsAdmin = !isOwner && collectionItem?.hide_images && user?.role === 'Super Admin';

  // Update to use original images for owner, watermarked for others
  const displayImages = isOwner ? [
    collectionItem?.obverseImage,
    collectionItem?.reverseImage
  ].filter(Boolean) : [
    collectionItem?.obverse_image_watermarked || collectionItem?.obverseImage,
    collectionItem?.reverse_image_watermarked || collectionItem?.reverseImage
  ].filter(Boolean) as string[];

  // Check for image suggestion status
  useEffect(() => {
    const checkImageStatus = async () => {
      if (!collectionItem?.id || !user?.id) {
        setSuggestionStatus(null);
        setHasPendingSuggestion(false);
        return;
      }

      // Calculate isOwner inside the effect to avoid dependency issues
      const isOwner = user?.id === collectionItem?.userId;

      try {
        console.log('Checking image suggestion status for collection item:', collectionItem.id);
        
        // Check if the collection item's suggestion was approved (supports legacy rows without collection_item_id)
        const { data: ownerSuggestions, error } = await supabase
          .from('image_suggestions')
          .select('status, collection_item_id, banknote_id')
          .or(
            `collection_item_id.eq.${collectionItem.id},and(collection_item_id.is.null,banknote_id.eq.${collectionItem.banknote.id})`
          )
          .eq('user_id', collectionItem.userId)
          .eq('status', 'approved')
          .limit(1);

        if (error) {
          console.error('Error checking image suggestions:', error);
          setSuggestionStatus(null);
          setHasPendingSuggestion(false);
          return;
        }

        // If owner's suggestion was approved, show "Catalogue Image"
        if (ownerSuggestions && ownerSuggestions.length > 0) {
          setSuggestionStatus('approved');
          setHasPendingSuggestion(false);
          return;
        }

        // If current user is the owner, check their other statuses (pending/rejected)
        if (isOwner) {
          const { data: userSuggestions, error: userError } = await supabase
            .from('image_suggestions')
            .select('status, collection_item_id, banknote_id')
            .or(
              `collection_item_id.eq.${collectionItem.id},and(collection_item_id.is.null,banknote_id.eq.${collectionItem.banknote.id})`
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (userError) {
            console.error('Error checking user suggestions:', userError);
          } else if (userSuggestions && userSuggestions.length > 0) {
            const status = userSuggestions[0].status as 'pending' | 'approved' | 'rejected';
            console.log('Current user suggestion status:', status);
            setSuggestionStatus(status);
            setHasPendingSuggestion(status === 'pending');
            return;
          }
        }

        // No relevant suggestions found
        setSuggestionStatus(null);
        setHasPendingSuggestion(false);
      } catch (error) {
        console.error("Failed to check image status:", error);
        setSuggestionStatus(null);
        setHasPendingSuggestion(false);
      }
    };

    checkImageStatus();
  }, [collectionItem?.id, collectionItem?.userId, user?.id]);

  // Fetch the owner's role to check if they are a Super Admin
  useEffect(() => {
    const fetchOwnerRole = async () => {
      if (!collectionItem?.userId) {
        setIsLoadingOwnerRole(false);
        return;
      }
      
      setIsLoadingOwnerRole(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', collectionItem.userId)
          .single();

        if (error) throw error;
        setItemOwnerRole(data?.role || null);
      } catch (error) {
        console.error('Error fetching owner role:', error);
      } finally {
        setIsLoadingOwnerRole(false);
      }
    };

    fetchOwnerRole();
  }, [collectionItem?.userId]);

  // Determine image orientations when displayImages change
  React.useEffect(() => {
    const determineOrientations = async () => {
      const orientations: Record<number, 'vertical' | 'horizontal'> = {};
      
      for (let i = 0; i < displayImages.length; i++) {
        orientations[i] = await getImageOrientation(displayImages[i]);
      }
      
      setImageOrientations(orientations);
    };

    if (displayImages.length > 0) {
      determineOrientations();
    }
  }, [displayImages]);

  // Early returns
  if (isLoading) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="flex justify-center py-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-gray-200 h-16 w-16 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !collectionItem) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4"> <span> {t('item.errorLoading')} </span> </h2>
          <p className="mb-6 text-muted-foreground">
            {t('item.couldNotLoad')}
          </p>
          <Button onClick={() => navigate(-1)}>{t('item.goBack')}</Button>
        </div>
      </div>
    );
  }

  const isOwnerSuperAdmin = itemOwnerRole === 'Super Admin';
  const isUserSuperAdmin = user?.role === 'Super Admin';
  const isUserCountryAdmin = user?.role && user.role.toLowerCase().includes('admin') && !user.role.toLowerCase().includes('super');
  const userAdminCountry = isUserCountryAdmin ? user?.role.toLowerCase().replace(' admin', '').trim() : null;
  
  // Only allow delete if we have confirmed the owner's role and all conditions are met
  const canDeleteImages = !isLoadingOwnerRole && !isOwnerSuperAdmin && (
    isUserSuperAdmin || 
    (isUserCountryAdmin && 
     userAdminCountry === collectionItem?.banknote?.country?.toLowerCase())
  );

  const hasCustomImages = Boolean(collectionItem?.obverseImage || collectionItem?.reverseImage);

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleUpdateSuccess = async (updatedItem?: CollectionItemType, hasImageChanged?: boolean) => {
    setIsEditDialogOpen(false);
    toast(t('item.collectionItemUpdatedSuccess'));
    
    // If images were changed, delete existing suggestions and reset suggestion status
    if (hasImageChanged && collectionItem?.id && user?.id) {
      try {
        await deleteExistingImageSuggestions(collectionItem.id, user.id);
        console.log("Existing image suggestions deleted successfully");
      } catch (error) {
        console.error("Failed to delete existing image suggestions:", error);
        // Don't show error to user as this is a background cleanup operation
      }
      
      // Reset suggestion status regardless of deletion success
      setSuggestionStatus(null);
      setHasPendingSuggestion(false);
      setImageChangedAfterApproval(suggestionStatus === 'approved');
    }
    
    // Refetch the data to get the latest updates
    await refetch();
  };

  const handleSuggestToCatalog = async () => {
    if (!collectionItem || !user) return;

    setIsSubmittingImages(true);
    try {
      // Delete any existing suggestions first (safety measure)
      try {
        await deleteExistingImageSuggestions(collectionItem.id, user.id);
      } catch (error) {
        console.error("Failed to delete existing suggestions before submitting new one:", error);
        // Continue with submission even if deletion fails
      }

      await submitImageSuggestion({
        banknoteId: collectionItem.banknote.id,
        userId: user.id,
        collectionItemId: collectionItem.id,
        obverseImage: collectionItem.obverseImage,
        reverseImage: collectionItem.reverseImage
      });

      toast(t('item.imagesSubmittedForCatalog'));
      setHasPendingSuggestion(true);
      setSuggestionStatus('pending');
      setImageChangedAfterApproval(false); // Reset the flag
    } catch (error) {
      console.error("Error suggesting images:", error);
      toast(t('item.failedToSubmitImages'));
    } finally {
      setIsSubmittingImages(false);
    }
  };

  const handleDeleteCollectionItem = async () => {
    if (!collectionItem) return;
    setIsDeleting(true);
    try {
      const { removeFromCollection } = await import("@/services/collectionService");
      await removeFromCollection(collectionItem.id);
      toast(t('item.collectionItemDeletedSuccess'));
      // Slight delay for better UX
      setTimeout(() => {
        navigate(-1);
      }, 600);
    } catch (error) {
      console.error("Error deleting collection item:", error);
      toast(t('item.failedToDeleteItem'));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete || !collectionItem) return;
    
    setIsDeletingImage(true);
    try {
      const { error } = await supabase
        .from('collection_items')
        .update({
          [`${imageToDelete}_image`]: null
        })
        .eq('id', collectionItem.id);

      if (error) throw error;

      toast.success(t('item.imageDeletedSuccess'));
      await refetch();
      setImageToDelete(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error(t('item.failedToDeleteImage'));
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Add reset function for rejected status
  const handleResetSuggestion = () => {
    setSuggestionStatus(null);
    setHasPendingSuggestion(false);
  };

  const handleToggleImageVisibility = async () => {
    if (!collectionItem) return;
    
    const newHideImages = !collectionItem.hide_images;
    setIsTogglingVisibility(true);
    
    try {
      const { updateCollectionItem } = await import("@/services/collectionService");
      await updateCollectionItem(collectionItem.id, {
        hide_images: newHideImages
      });
      
      toast(newHideImages ? t('item.imagesPrivate') : t('item.imagesPublic'));
      
      // Force refetch to update the UI
      await refetch();
    } catch (error) {
      console.error("Error updating image visibility:", error);
      toast(t('item.failedToUpdateImageVisibility'));
    } finally {
      setIsTogglingVisibility(false);
      setShowVisibilityDialog(false);
    }
  };

  const getImageOrientation = (imageUrl: string): Promise<'vertical' | 'horizontal'> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.height > img.width ? 'vertical' : 'horizontal');
      };
      img.onerror = () => {
        resolve('horizontal'); // Default to horizontal if image fails to load
      };
      img.src = imageUrl;
    });
  };

  // Translation helper functions
  const getLocalizedField = (field: string, fieldType: 'face_value' | 'country'): string => {
    if (currentLanguage === 'en' || !field) {
      return field || '';
    }

    const banknoteAny = collectionItem?.banknote as any;
    let languageSpecificField: string | undefined;
    
    if (currentLanguage === 'ar') {
      languageSpecificField = banknoteAny?.[`${fieldType}_ar`];
    } else if (currentLanguage === 'tr') {
      languageSpecificField = banknoteAny?.[`${fieldType}_tr`];
    }

    return languageSpecificField || field;
  };
  

  // Render
  return (
    <div className="page-container">
      <div className="flex flex-col space-y-6">
        <div className="space-y-1 page-container max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline  gap-2">
              <Button
                onClick={() => navigate(-1)}
                variant="ghost"
                size="icon"
                className="h-10 w-10"
              >
                {direction === 'rtl' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                {/* <ArrowLeft className="h-5 w-5" /> match h1 size */}
              </Button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold leading-tight">
                    <span> {getLocalizedField(collectionItem.banknote?.denomination || '', 'face_value')} </span>
                  </h1>

                  <Star className="h-5 w-5 fill-gold-400 text-gold-400" />

                  {collectionItem.banknote?.extendedPickNumber && (
                    <p className="text-xl leading-tight">
                      {collectionItem.banknote.extendedPickNumber}
                    </p>
                  )}
                </div>

                <p className="text-xl text-muted-foreground">
                  {getLocalizedField(collectionItem.banknote?.country || '', 'country')}
                  {collectionItem.banknote?.country && collectionItem.banknote?.year && ", "}
                  {collectionItem.banknote?.year}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <Card className={suggestionStatus === 'approved' ? 'border-2 border-gold-500 bg-gold-50/50' : ''}>
              <CardContent className="px-2 pt-2 pb-2">
                <div className="flex flex-col space-y-3">
                  {/* Show "Catalogue Image" status to everyone when approved */}
                  {(suggestionStatus === 'approved' && hasCustomImages) && (
                    <div className="w-full rounded-md">
                      <div className="w-full flex justify-between items-center py-2 px-3">
                          <div className="w-full flex items-center justify-center gap-2 py-1.5">
                            <Star className="h-5 w-5 fill-gold-500 text-gold-500" />
                            <span className="font-medium text-gold-600">
                              {t('item.catalogueImage')}
                            </span>
                          </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Show owner-only controls for non-approved suggestions */}
                  {(isOwner && hasCustomImages && suggestionStatus !== 'approved') && (
                    <div className="w-full rounded-md">
                      <div className="w-full flex justify-between items-center py-2 px-3">
                        {suggestionStatus === 'rejected' ? (
                          <div className="w-full flex items-center gap-2">
                            <Button
                              onClick={handleSuggestToCatalog}
                              variant="outline"
                              className="flex-2 flex items-center gap-2"
                              disabled={isSubmittingImages}
                            >
                              <ImagePlus className="h-4 w-4" />
                              {t('item.tryAgain')}
                            </Button>
                            <span className="text-sm text-red-600 font-medium px-2">
                              {t('item.requestRejected')}
                            </span>
                          </div>
                        ) : (
                          <Button
                            onClick={handleSuggestToCatalog}
                            variant="outline"
                            className="w-full flex items-center gap-2"
                            disabled={isSubmittingImages || hasPendingSuggestion}
                          >
                            <ImagePlus className="h-4 w-4" />
                            {hasPendingSuggestion
                              ? t('item.imageSuggestionPending')
                              : isSubmittingImages
                                ? t('item.submitting')
                                : t('item.suggestImagesToCatalogues')}
                          </Button>
                        )}
                      </div>
                      {/* Show message when user can re-suggest after image change */}
                      {  imageChangedAfterApproval&& (
                        <div className="text-sm text-muted-foreground text-center px-3 py-1">
                          {t('item.imagesUpdatedMessage')}
                        </div>
                      )}
                    </div>
                  )}

                  {shouldHideImages ? (
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">{t('item.privateImages')}</p>
                    </div>
                  ) : displayImages.length > 0 ? (
                    <div className="relative">
                      {(isOwner || isShowingPrivateAsAdmin) && (
                        <div className="absolute top-2 left-2 z-10">
                          {isShowingPrivateAsAdmin ? (
                            <div className="bg-white/90 rounded-sm px-2 py-1 shadow-sm border">
                              <p className="text-xs text-muted-foreground">{t('item.privateImagesAdmin')}</p>
                            </div>
                          ) : (
                          <AlertDialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="bg-white hover:bg-white/90 text-xs flex items-center gap-1 shadow-sm border"
                              >
                                {Boolean(collectionItem?.hide_images) ? (
                                  <>
                                    <EyeOff className="h-3 w-3" />
                                    <span>{t('item.imagesVisibleToYou')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>{t('item.imagesVisibleToAll')}</span>
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {collectionItem?.hide_images 
                                    ? t('item.makeImagesPublic') 
                                    : t('item.makeImagesPrivate')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {collectionItem?.hide_images
                                    ? t('item.makeImagesPublicConfirm')
                                    : t('item.makeImagesPrivateConfirm')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isTogglingVisibility}>{t('item.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleToggleImageVisibility}
                                  disabled={isTogglingVisibility}
                                >
                                  {isTogglingVisibility 
                                    ? t('item.updating') 
                                    : collectionItem?.hide_images
                                      ? t('item.makePublic')
                                      : t('item.makePrivate')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          )}
                        </div>
                      )}
                      {displayImages.length === 2 ? (
                        // For exactly 2 images (obverse/reverse), check orientations
                        (() => {
                          const firstOrientation = imageOrientations[0];
                          const secondOrientation = imageOrientations[1];
                          
                          // If both images are vertical, display side by side
                          if (firstOrientation === 'vertical' && secondOrientation === 'vertical') {
                            return (
                              <div className="grid grid-cols-2 gap-3">
                      {displayImages.map((url, index) => (
                                  <div key={index} className="relative">
                                    {canDeleteImages && (
                                      <div className="absolute top-2 right-2 z-10">
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-100/50 bg-white/80"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>{t('item.deleteImage')}</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                {t('item.deleteImageConfirm')}
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel disabled={isDeletingImage}>{t('item.cancel')}</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => {
                                                  setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                                  handleDeleteImage();
                                                }}
                                                className="bg-red-600 hover:bg-red-700"
                                                disabled={isDeletingImage}
                                              >
                                                {isDeletingImage ? t('item.deleting') : t('item.delete')}
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    )}
                                    <div
                                      className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => openImageViewer(url)}
                                    >
                                      <div className="w-full overflow-hidden border">
                                        <img
                                         alt={`Obverse of a ${collectionItem.banknote?.denomination} banknote from ${collectionItem.banknote?.country}, issued in ${collectionItem.banknote?.year}`}
                                          src={url}
                                          className="w-full h-auto object-contain"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // If any image is horizontal, stack them vertically
                          return (
                            <div className="flex flex-col space-y-3">
                              {displayImages.map((url, index) => (
                                <div key={index} className="relative">
                          {canDeleteImages && (
                            <div className="absolute top-2 right-2 z-10">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100/50 bg-white/80"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('item.deleteImage')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('item.deleteImageConfirm')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeletingImage}>{t('item.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                        handleDeleteImage();
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={isDeletingImage}
                                    >
                                      {isDeletingImage ? t('item.deleting') : t('item.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          <div
                            className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openImageViewer(url)}
                          >
                            <div className="w-full overflow-hidden border">
                              <img
                              alt={` ${collectionItem.banknote?.denomination} banknote from ${collectionItem.banknote?.country}, issued in ${collectionItem.banknote?.year}`}
                                src={url}
                                className="w-full h-auto object-contain"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                            </div>
                          );
                        })()
                      ) : (
                        // For more than 2 images, stack them vertically
                        displayImages.map((url, index) => (
                          <div key={index} className="w-full relative">
                            {canDeleteImages && (
                              <div className="absolute top-2 right-2 z-10">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-100/50 bg-white/80"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t('item.deleteImage')}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t('item.deleteImageConfirm')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isDeletingImage}>{t('item.cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                          handleDeleteImage();
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={isDeletingImage}
                                      >
                                        {isDeletingImage ? t('item.deleting') : t('item.delete')}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                            <div
                              className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageViewer(url)}
                            >
                              <div className="w-full  overflow-hidden border">
                                <img
                                alt={` ${collectionItem.banknote?.denomination} banknote from ${collectionItem.banknote?.country}, issued in ${collectionItem.banknote?.year}`}
                                  src={url}
                                  className="w-full h-auto object-contain"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">{t('item.noImagesAvailable')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl m-0">
                    <span> {isOwner ? t('item.myCollectionCopy') : t('item.collectionCopy')} </span>
                  </CardTitle>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 hover:bg-red-100"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isDeleting || isEditDialogOpen}
                        title={t('item.deleteCollectionItem')}
                      >
                        <Trash className="w-4 h-4" />
                        <span className="sr-only">{t('item.delete')}</span>
                      </Button>
                      <Button
                        title={t('item.editCollectionItem')}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => setIsEditDialogOpen(true)}
                        disabled={isDeleting}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className={direction === 'rtl' ? 'text-right' : 'text-left'}>
                  {isOwner
                    ? t('item.detailsAboutCopy')
                    : t('item.informationAboutCopy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <BanknoteCollectionDetail isOwner={isOwner} />
              </CardContent>
            </Card>

            
          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t('item.back')}
          </Button>
        </div>
      </div>

      {/* Replace the existing Dialog preview with: */}
      <ImagePreview 
              src={selectedImage}
        onClose={() => setSelectedImage(null)}
            />

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContentWithScroll className="sm:max-w-[800px]" onClick={(e) => e.stopPropagation()}>
          <CollectionItemFormEdit
            collectionItem={collectionItem}
            onUpdate={handleUpdateSuccess}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContentWithScroll>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('item.deleteCollectionItemConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('item.deleteCollectionItemDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('item.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteCollectionItem}
              disabled={isDeleting}
            >
              {isDeleting ? t('item.deletingItem') : t('item.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}