
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
import { ArrowLeft, Star, ImagePlus, Edit, Trash, Trash2, Eye, EyeOff } from "lucide-react";
import BanknoteCollectionDetail from "./BanknoteCollectionDetail";
import { BanknoteProvider } from "@/context/BanknoteContext";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import EditUnlistedBanknoteDialog from "@/components/collection/EditUnlistedBanknoteDialog";
import { submitImageSuggestion, hasExistingImageSuggestion } from "@/services/imageSuggestionsService";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingImages, setIsSubmittingImages] = useState(false);
  const [hasPendingSuggestion, setHasPendingSuggestion] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<'obverse' | 'reverse' | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  
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
    if (!collectionItem?.banknote.id || !user?.id) return;

    try {
      const hasExisting = await hasExistingImageSuggestion(
        collectionItem.banknote.id,
        user.id
      );
      setHasPendingSuggestion(hasExisting);
    } catch (error) {
      console.error("Failed to check existing suggestions:", error);
    }
  };

  const handleUpdateSuccess = async () => {
    setIsEditDialogOpen(false);
    toast("Collection item updated successfully");
    // Refetch the data to get the latest updates
    await refetch();
  };

  // Determine if the current user is the owner of this item
  const isOwner = user?.id === collectionItem?.userId;
  console.log("CollectionItem - isOwner:", isOwner, "userId:", user?.id, "itemUserId:", collectionItem?.userId);

  const handleSuggestToCatalog = async () => {
    if (!collectionItem || !user) return;

    setIsSubmittingImages(true);
    try {
      await submitImageSuggestion({
        banknoteId: collectionItem.banknote.id,
        userId: user.id,
        obverseImage: collectionItem.obverseImage,
        reverseImage: collectionItem.reverseImage
      });

      toast("Your images have been submitted for catalog consideration");
      setHasPendingSuggestion(true);
    } catch (error) {
      console.error("Error suggesting images:", error);
      toast("Failed to submit images. Please try again later.");
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
      toast("Collection item deleted successfully");
      // Slight delay for better UX
      setTimeout(() => {
        navigate(-1);
      }, 600);
    } catch (error) {
      console.error("Error deleting collection item:", error);
      toast("Failed to delete item. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleImageVisibility = async () => {
    if (!collectionItem) return;
    
    try {
      const { updateCollectionItem } = await import("@/services/collectionService");
      await updateCollectionItem(collectionItem.id, {
        hideImages: !collectionItem.hideImages
      });
      
      toast(collectionItem.hideImages ? "Images are now visible to all users" : "Images are now private");
      await refetch();
    } catch (error) {
      console.error("Error updating image visibility:", error);
      toast("Failed to update image visibility");
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

      toast.success('Image deleted successfully');
      await refetch();
      setImageToDelete(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    } finally {
      setIsDeletingImage(false);
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
          <h2 className="text-2xl font-serif mb-4">Error Loading Collection Item</h2>
          <p className="mb-6 text-muted-foreground">
            We couldn't load the collection item details. Please try again later.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const displayImages = [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[];

  // Check if images should be hidden for non-owners
  const shouldHideImages = !isOwner && collectionItem?.hideImages;

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
                <ArrowLeft className="h-5 w-5" /> {/* match h1 size */}
              </Button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold leading-tight">
                    {collectionItem.banknote.denomination}
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
                          ? "Image Suggestion Pending"
                          : isSubmittingImages
                            ? "Submitting..."
                            : "Suggest Images to Catalog"}
                      </Button>
                    </div>
                  )}

                  {shouldHideImages ? (
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">Private images, only visible to the owner.</p>
                    </div>
                  ) : displayImages.length > 0 ? (
                    <div className="relative">
                      {isOwner && displayImages.length > 0 && (
                        <div className="absolute top-2 left-2 z-10">
                          <Button
                            onClick={handleToggleImageVisibility}
                            variant="ghost"
                            size="sm"
                            className="bg-white/80 hover:bg-white/90 text-xs flex items-center gap-1"
                          >
                            {collectionItem.hideImages ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                Private images, only visible to you
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                Images visible to all users
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {displayImages.map((url, index) => (
                        <div
                          key={index}
                          className="w-full relative mb-3 last:mb-0"
                        >
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
                                    <AlertDialogTitle>Delete Image</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this image? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeletingImage}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setImageToDelete(index === 0 ? 'obverse' : 'reverse');
                                        handleDeleteImage();
                                      }}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={isDeletingImage}
                                    >
                                      {isDeletingImage ? 'Deleting...' : 'Delete'}
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
                            <div className="w-full rounded-md overflow-hidden border">
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
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
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
                    {isOwner ? "My Collection Copy" : "Collection Copy"}
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
                        <span className="sr-only">Delete</span>
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
                <CardDescription>
                  {isOwner
                    ? "Details about your personal copy of this banknote"
                    : "Information about this collector's copy of the banknote"}
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
            Back
          </Button>
        </div>
      </div>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContentWithScroll className="sm:max-w-[800px] p-1">
            <img
              src={selectedImage}
              alt="Banknote detail"
              className="w-full h-auto rounded"
            />
          </DialogContentWithScroll>
        </Dialog>
      )}

      {/* Edit dialog */}
      <EditUnlistedBanknoteDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onUpdate={handleUpdateSuccess}
        collectionItem={collectionItem}
        user={user}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={e => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item from your collection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={handleDeleteCollectionItem}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
