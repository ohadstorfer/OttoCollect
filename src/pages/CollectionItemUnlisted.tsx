import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCollectionItem } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import type { CollectionItem as CollectionItemType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContentWithScroll } from "@/components/ui/dialog";
import { toast } from "sonner";
import CollectionItemForm from "@/components/collection/CollectionItemForm";
import { ArrowLeft, Star, ImagePlus, Edit, Trash, Trash2, Eye, EyeOff, ArrowRight } from "lucide-react";
import BanknoteCollectionDetail from "./BanknoteCollectionDetail";
import { BanknoteProvider } from "@/context/BanknoteContext";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import EditUnlistedBanknoteDialog from "@/components/collection/EditUnlistedBanknoteDialog";
import { submitImageSuggestion, hasExistingImageSuggestion } from "@/services/imageSuggestionsService";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import BanknoteCollectionDetaiUnlisted from "./BanknoteCollectionDetaiUnlisted";
import ImagePreview from "@/components/shared/ImagePreview";
import { useTranslation } from "react-i18next";
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

export default function CollectionItemUnlisted() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation(['collection']);
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

  
  

  // Check if user has pending image suggestions for this banknote
  useEffect(() => {
    if (collectionItem && user && isOwner) {
      checkExistingSuggestion();
    }
  }, [collectionItem, user]);

  const checkExistingSuggestion = async () => {
    if (!collectionItem?.id || !user?.id) return;

    try {
      const { hasSuggestion } = await hasExistingImageSuggestion(
        collectionItem.id,
        user.id
      );
      setHasPendingSuggestion(hasSuggestion);
    } catch (error) {
      console.error("Failed to check existing suggestions:", error);
    }
  };

  const handleUpdateSuccess = async () => {
    setIsEditDialogOpen(false);
           toast(t('collectionItemUpdatedSuccess'));
    // Refetch the data to get the latest updates
    await refetch();
  };

  // Determine if the current user is the owner of this item
  const isOwner = user?.id === collectionItem?.userId;
  console.log("CollectionItem - isOwner:", isOwner, "userId:", user?.id, "itemUserId:", collectionItem?.userId);

  // Check if images should be hidden for non-owners
  const shouldHideImages = !isOwner && collectionItem?.hide_images && user?.role !== 'Super Admin';

  // Check if showing private images as admin
  const isShowingPrivateAsAdmin = !isOwner && collectionItem?.hide_images && user?.role === 'Super Admin';

  const handleSuggestToCatalog = async () => {
    if (!collectionItem || !user) return;

    setIsSubmittingImages(true);
    try {
      await submitImageSuggestion({
        banknoteId: collectionItem.banknote.id,
        userId: user.id,
        collectionItemId: collectionItem.id,
        obverseImage: collectionItem.obverseImage,
        reverseImage: collectionItem.reverseImage
      });

             toast(t('imagesSubmittedForCatalog'));
      setHasPendingSuggestion(true);
    } catch (error) {
      console.error("Error suggesting images:", error);
             toast(t('failedToSubmitImages'));
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
             toast(t('collectionItemDeletedSuccess'));
      // Slight delay for better UX
      setTimeout(() => {
        navigate(-1);
      }, 600);
    } catch (error) {
      console.error("Error deleting collection item:", error);
             toast(t('failedToDeleteItem'));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const hasCustomImages = Boolean(collectionItem?.obverseImage || collectionItem?.reverseImage);

  const isUserSuperAdmin = user?.role === 'Super Admin';
  const isUserCountryAdmin = user?.role && user.role.toLowerCase().includes('admin') && !user.role.toLowerCase().includes('super');
  const userAdminCountry = isUserCountryAdmin ? user?.role.toLowerCase().replace(' admin', '').trim() : null;
  
  // Fetch the owner's role to check if they are a Super Admin
  const [itemOwnerRole, setItemOwnerRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchOwnerRole = async () => {
      if (!collectionItem?.userId) return;
      
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
      }
    };

    fetchOwnerRole();
  }, [collectionItem?.userId]);

  const isOwnerSuperAdmin = itemOwnerRole === 'Super Admin';
  
  const canDeleteImages = !isOwnerSuperAdmin && (
    isUserSuperAdmin || 
    (isUserCountryAdmin && 
     userAdminCountry === collectionItem?.banknote.country.toLowerCase())
  );

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

             toast.success(t('imageDeletedSuccess'));
      await refetch();
      setImageToDelete(null);
    } catch (error) {
      console.error('Error deleting image:', error);
             toast.error(t('failedToDeleteImage'));
    } finally {
      setIsDeletingImage(false);
    }
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
      
             toast(newHideImages ? t('imagesPrivate') : t('imagesPublic'));
      
      // Force refetch to update the UI
      await refetch();
    } catch (error) {
      console.error("Error updating image visibility:", error);
             toast(t('failedToUpdateImageVisibility'));
    } finally {
      setIsTogglingVisibility(false);
      setShowVisibilityDialog(false);
    }
  };

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
          <h2 className="text-2xl font-serif mb-4"> <span> {t('errorLoadingCollectionItem')} </span> </h2>
          <p className="mb-6 text-muted-foreground">
            {t('couldNotLoadCollectionItem')}
          </p>
          <Button onClick={() => navigate(-1)}>{t('goBack')}</Button>
        </div>
      </div>
    );
  }

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const displayImages = [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[];

  return (
    <div className="page-container">
      <div className="flex flex-col space-y-6">
        <div className="space-y-1 page-container max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="h-10 w-10"
              >
                 {direction === 'rtl' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold leading-tight">
                    <span> {collectionItem.banknote.denomination} </span>
                  </h1>

                  <Star className="h-5 w-5 fill-gold-400 text-gold-400" />

                  {collectionItem.banknote.extendedPickNumber && (
                    <p className="text-xl leading-tight">
                      {collectionItem.banknote.extendedPickNumber}
                    </p>
                  )}
                </div>

                <p className="text-xl text-muted-foreground">
                  {collectionItem.banknote.country}
                  {collectionItem.banknote.country && collectionItem.banknote.year && ", "}
                  {collectionItem.banknote.year}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="px-2 pt-2 pb-2">
                <div className="flex flex-col space-y-3">
                  {isOwner && hasCustomImages && (
                    <div className="w-full flex justify-between items-center py-2">
                      <Button
                        onClick={handleSuggestToCatalog}
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        disabled={isSubmittingImages || hasPendingSuggestion}
                      >
                        <ImagePlus className="h-4 w-4" />
                        {hasPendingSuggestion
                           ? t('imageSuggestionPending')
                          : isSubmittingImages
                             ? t('submitting')
                             : t('suggestImagesToCatalog')}
                      </Button>
                    </div>
                  )}

                  {shouldHideImages ? (
                    <div className="p-6 text-center bg-muted rounded-md">
                                             <p className="text-muted-foreground">{t('privateImagesOnlyVisibleToOwner')}</p>
                    </div>
                  ) : displayImages.length > 0 ? (
                    <div className="relative">
                      {(isOwner || isShowingPrivateAsAdmin) && (
                        <div className="absolute top-2 left-2 z-10">
                          {isShowingPrivateAsAdmin ? (
                            <div className="bg-white/90 rounded-sm px-2 py-1 shadow-sm border">
                                                             <p className="text-xs text-muted-foreground">{t('privateImagesVisibleToAdmins')}</p>
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
                                                                         <span>{t('privateImagesOnlyVisibleToYou')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                                                         <span>{t('imagesVisibleToAllUsers')}</span>
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle><span>
                                  {collectionItem?.hide_images 
                                     ? t('makeImagesPublic') 
                                     : t('makeImagesPrivate')}
                                </span>
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {collectionItem?.hide_images
                                     ? t('makeImagesPublicConfirmation')
                                     : t('makeImagesPrivateConfirmation')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                                                 <AlertDialogCancel disabled={isTogglingVisibility}>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleToggleImageVisibility}
                                  disabled={isTogglingVisibility}
                                >
                                  {isTogglingVisibility 
                                     ? t('updating') 
                                    : collectionItem?.hide_images
                                       ? t('makePublic')
                                       : t('makePrivate')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          )}
                        </div>
                      )}
                      {displayImages.length === 2 ? (
                        // For exactly 2 images (obverse/reverse), render side by side
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
                                         <AlertDialogTitle>{t('deleteImage')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                           {t('deleteImageConfirmation')}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isDeletingImage}>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                            handleDeleteImage();
                                          }}
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={isDeletingImage}
                                        >
                                          {isDeletingImage ? t('deleting') : t('delete')}
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
                                    src={url}
                                    alt={`Banknote Image ${index + 1}`}
                                    className="w-full h-auto object-contain"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
                                       <AlertDialogTitle><span>{t('deleteImage')}</span></AlertDialogTitle>
                                      <AlertDialogDescription>
                                         {t('deleteImageConfirmation')}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isDeletingImage}>{t('cancel')}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                          handleDeleteImage();
                                        }}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={isDeletingImage}
                                      >
                                        {isDeletingImage ? t('deleting') : t('delete')}
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
                                  src={url}
                                  alt={`Banknote Image ${index + 1}`}
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
                      <p className="text-muted-foreground">{t('noImagesAvailable')}</p>
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
                                         <span>{isOwner ? t('myCollectionCopy') : t('collectionCopy')}</span>
                  </CardTitle>
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-red-600 hover:bg-red-100"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isDeleting || isEditDialogOpen}
                        aria-label="Delete"
                      >
                        <Trash className="w-4 h-4" />
                                                 <span className="sr-only">{t('delete')}</span>
                      </Button>
                      <Button
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
                     ? t('detailsAboutPersonalCopy')
                     : t('informationAboutCollectorsCopy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <BanknoteCollectionDetaiUnlisted isOwner={isOwner} />
              </CardContent>
            </Card>
            

          </div>
        </div>

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t('back')}
          </Button>
        </div>
      </div>

      <ImagePreview 
        src={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Edit dialog */}
      <EditUnlistedBanknoteDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleUpdateSuccess}
        collectionItem={collectionItem}
        // user={user}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
                         <AlertDialogTitle><span>{t('deleteCollectionItem')}</span></AlertDialogTitle>
            <AlertDialogDescription>
                             {t('deleteCollectionItemConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
                         <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteCollectionItem}
              disabled={isDeleting}
            >
                             {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
