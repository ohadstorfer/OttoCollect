import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { CollectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fetchUserCollection } from "@/services/collectionService";
import CollectionItemForm from "@/components/collection/CollectionItemForm";

import {
  ArrowLeft,
  Star,
  Pencil,
  Eye
} from "lucide-react";
import BanknoteCatalogDetailMinimized from "./BanknoteCatalogDetailMinimized";

interface BanknoteCollectionDetailProps {
  banknoteId?: string; // Make optional for backward compatibility
  isOwner?: boolean;    // Add isOwner prop
}

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

const BanknoteCollectionDetail: React.FC<BanknoteCollectionDetailProps> = ({ 
  banknoteId: propsBanknoteId, 
  isOwner = true // Default to true for backward compatibility
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [collectionItem, setCollectionItem] = useState<CollectionItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Use banknoteId from props if provided, otherwise from URL params
  const id = propsBanknoteId || paramId;

  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  const { data: userCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["userCollection", user?.id],
    queryFn: () => user ? fetchUserCollection(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  useEffect(() => {
    if (user && userCollection && banknote) {
      const foundItem = userCollection.find(item => item.banknoteId === banknote.id);
      if (foundItem) {
        setCollectionItem(foundItem);
      } else {
        // If not in collection, redirect to catalog view with the correct path
        navigate(`/banknote-details/${id}`);
      }
    }
  }, [user, userCollection, banknote, id, navigate]);

  const isLoading = banknoteLoading || collectionLoading;
  const isInCollection = !!collectionItem;

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };
  
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };
  
  const handleUpdate = (updatedItem: CollectionItem) => {
    setCollectionItem(updatedItem);
    setIsEditMode(false); // Switch back to view mode after update
    toast.success("Collection item updated successfully");
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

  if (banknoteError || !banknote) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Error Loading Banknote</h2>
          <p className="mb-6 text-muted-foreground">
            We couldn't load the banknote details. Please try again later.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!isInCollection) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <h1 className="page-title">Banknote Details</h1>
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Not In Your Collection</h2>
            <p className="mb-6 text-muted-foreground">
              This banknote is not in your collection.
            </p>
            <Button onClick={() => navigate(`/catalog-banknote/${id}`)}>View in Catalog</Button>
          </div>
        </div>
      </div>
    );
  }

  // Collection item is guaranteed to exist at this point
  const displayImages = [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[];
  if (displayImages.length === 0 && banknote.imageUrls) {
    // Fall back to catalog images if no collection images available
    if (Array.isArray(banknote.imageUrls) && banknote.imageUrls.length > 0) {
      displayImages.push(banknote.imageUrls[0]);
    } else if (typeof banknote.imageUrls === 'string') {
      displayImages.push(banknote.imageUrls);
    }
  }

  return (
    <div className="page-container max-w-5xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center space-x-2">
          {collectionItem?.isForSale && (
            <Badge variant="default" className="text-sm font-medium px-3 py-1 outline-none ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0">
              For Sale
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {banknote.denomination}
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          <div className="lg:col-span-5">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xl">My Collection Copy</CardTitle>
                  <CardDescription>Details about your copy of this banknote</CardDescription>
                </div>
                {isOwner && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleEditMode}
                    className="gap-1"
                  >
                    {isEditMode ? (
                      <>
                        <Eye className="h-4 w-4" />
                        View
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {isEditMode && isOwner ? (
                  <CollectionItemForm
                    collectionItem={collectionItem}
                    onUpdate={handleUpdate}
                  />
                ) : (
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-2">Details</h3>
                        <div className="space-y-2">
                          <LabelValuePair label="Condition" value={collectionItem.condition} />
                          {collectionItem.purchasePrice && (
                            <LabelValuePair label="Purchase Price" value={`$${collectionItem.purchasePrice}`} />
                          )}
                          {collectionItem.purchaseDate && (
                            <LabelValuePair 
                              label="Purchase Date" 
                              value={new Date(collectionItem.purchaseDate).toLocaleDateString()} 
                            />
                          )}
                          {collectionItem.location && (
                            <LabelValuePair label="Location" value={collectionItem.location} />
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Notes</h3>
                        {collectionItem.publicNote ? (
                          <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm">{collectionItem.publicNote}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No public notes available</p>
                        )}
                        
                        {isOwner && collectionItem.privateNote && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium mb-1">Private Note</h4>
                            <div className="p-3 bg-blue-50 rounded-md">
                              <p className="text-sm">{collectionItem.privateNote}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Images</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {displayImages.length > 0 ? (
                          displayImages.map((url, index) => (
                            <div 
                              key={index}
                              className="aspect-[3/2] cursor-pointer rounded-md overflow-hidden border"
                              onClick={() => openImageViewer(url)}
                            >
                              <img
                                src={url}
                                alt={`Banknote ${index === 0 ? 'Obverse' : 'Reverse'}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 flex items-center justify-center p-8 bg-muted rounded-md">
                            <p className="text-muted-foreground">No images available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <BanknoteCatalogDetailMinimized />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-[800px] p-1">
            <img
              src={selectedImage}
              alt="Banknote detail"
              className="w-full h-auto rounded"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default BanknoteCollectionDetail;
