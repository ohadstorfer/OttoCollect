
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { CollectionItem, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getUserProfile } from "@/services/profileService";
import { fetchUserCollection } from "@/services/collectionService";
import { ArrowLeft, ImageIcon, Star } from "lucide-react";
import BanknoteCatalogDetailMinimized from "./BanknoteCatalogDetailMinimized";

export default function UserBanknoteCollectionDetail() {
  const { userId, banknoteId } = useParams<{ userId: string; banknoteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [collectionOwner, setCollectionOwner] = useState<User | null>(null);

  // Fetch banknote details
  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", banknoteId],
    queryFn: () => fetchBanknoteDetail(banknoteId || ""),
    enabled: !!banknoteId,
  });

  // Fetch collection owner profile
  const { data: ownerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId || ""),
    enabled: !!userId,
    onSuccess: (data) => {
      if (data) setCollectionOwner(data);
    }
  });

  // Fetch the owner's collection
  const { data: ownerCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["userCollection", userId],
    queryFn: () => userId ? fetchUserCollection(userId) : Promise.resolve([]),
    enabled: !!userId,
  });

  // Find the specific collection item we're viewing
  const collectionItem = ownerCollection?.find(item => item.banknoteId === banknoteId) || null;

  const isLoading = banknoteLoading || profileLoading || collectionLoading;

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
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

  if (banknoteError || !banknote || !collectionItem) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Error Loading Banknote</h2>
          <p className="mb-6 text-muted-foreground">
            We couldn't find this banknote in the user's collection.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Collection item is guaranteed to exist at this point
  const displayImages = [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[];
  if (displayImages.length === 0 && banknote.imageUrls && banknote.imageUrls.length > 0) {
    // Fall back to catalog images if no collection images available
    displayImages.push(banknote.imageUrls[0]);
  }

  return (
    <div className="page-container max-w-5xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center space-x-2">
          {collectionItem?.isForSale && (
            <Badge variant="default" className="text-sm font-medium px-3 py-1">
              For Sale
            </Badge>
          )}
          
          {collectionOwner && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/profile/${collectionOwner.id}`)}
            >
              View {collectionOwner.username}'s Profile
            </Button>
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
            {collectionOwner && (
              <p className="text-muted-foreground">
                From {collectionOwner.username}'s collection
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          <div className="lg:col-span-5">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Collection Copy</CardTitle>
                <CardDescription>Details about this copy</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Collection Copy Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-3">
                      <div className="text-muted-foreground font-medium">Condition</div>
                      <div>
                        <Badge variant="outline">
                          {collectionItem.condition}
                        </Badge>
                      </div>
                      
                      {collectionItem.purchaseDate && (
                        <>
                          <div className="text-muted-foreground font-medium">Purchase Date</div>
                          <div>{new Date(collectionItem.purchaseDate).toLocaleDateString()}</div>
                        </>
                      )}
                      
                      {collectionItem.purchasePrice && (
                        <>
                          <div className="text-muted-foreground font-medium">Purchase Price</div>
                          <div>${collectionItem.purchasePrice}</div>
                        </>
                      )}
                      
                      {collectionItem.seller && (
                        <>
                          <div className="text-muted-foreground font-medium">Seller</div>
                          <div>{collectionItem.seller}</div>
                        </>
                      )}
                      
                      {collectionItem.notes && (
                        <>
                          <div className="text-muted-foreground font-medium">Notes</div>
                          <div className="whitespace-pre-wrap">{collectionItem.notes}</div>
                        </>
                      )}
                      
                      {collectionItem.isForSale && (
                        <>
                          <div className="text-muted-foreground font-medium">Sale Price</div>
                          <div className="font-medium text-green-600">${collectionItem.salePrice}</div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Collection Images */}
                  {displayImages.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 mb-3 font-medium">
                        <ImageIcon className="h-4 w-4" /> Collection Images
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {displayImages.map((url, index) => (
                          <div 
                            key={index} 
                            className="aspect-[3/2] cursor-pointer hover:opacity-90 transition-opacity border rounded-md overflow-hidden"
                            onClick={() => openImageViewer(url)}
                          >
                            <img 
                              src={url} 
                              alt={`Collection ${index === 0 ? 'obverse' : 'reverse'}`}
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <BanknoteCatalogDetailMinimized />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        
        {userId && (
          <Button onClick={() => navigate(`/profile/${userId}`)}>
            View Full Collection
          </Button>
        )}
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
