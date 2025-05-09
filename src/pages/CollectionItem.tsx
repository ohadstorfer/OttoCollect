import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCollectionItem } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import type { CollectionItem as CollectionItemType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import CollectionItemForm from "@/components/collection/CollectionItemForm";
import { ArrowLeft, Star, ImagePlus } from "lucide-react";
import BanknoteCollectionDetail from "./BanknoteCollectionDetail";
import { BanknoteProvider } from "@/context/BanknoteContext";
import BanknoteCatalogDetailMinimized from "./BanknoteCatalogDetailMinimized";

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch collection item directly by ID
  const { data: collectionItem, isLoading, isError } = useQuery({
    queryKey: ["collectionItem", id],
    queryFn: () => fetchCollectionItem(id || ""),
    enabled: !!id,
  });

  // Determine if the current user is the owner of this item
  const isOwner = user?.id === collectionItem?.userId;
  console.log("CollectionItem - isOwner:", isOwner, "userId:", user?.id, "itemUserId:", collectionItem?.userId);

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

  // We'll eventually remove this check once we allow public viewing
  if (user?.id !== collectionItem.userId) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Not Authorized</h2>
          <p className="mb-6 text-muted-foreground">
            You don't have permission to view this collection item.
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

  return (
    <div className="page-container max-w-5xl mx-auto py-10">


      <div className="flex flex-col space-y-6">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-baseline  gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="p-0 w-auto h-auto min-w-0 flex items-center justify-center"
              >
                <ArrowLeft className="h-5 w-5" /> {/* match h1 size */}
              </Button>

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
          </div>

          <p className="text-xl text-muted-foreground">
            {collectionItem.banknote.country}, {collectionItem.banknote.year}
          </p>
        </div>





        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="px-2 pt-2 pb-2">
                <div className="flex flex-col space-y-3">
                  {displayImages.length > 0 ? (
                    displayImages.map((url, index) => (
                      <div
                        key={index}
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
                    ))
                  ) : (
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">
                  {isOwner ? "My Collection Copy" : "Collection Copy"}
                </CardTitle>
                <CardDescription>
                  {isOwner
                    ? "Details about your personal copy of this banknote"
                    : "Information about this collector’s copy of the banknote"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <BanknoteCollectionDetail isOwner={isOwner} />
              </CardContent>
            </Card>

            <BanknoteProvider banknoteId={collectionItem.banknote.id}>
              <div className="mt-6">
                <BanknoteCatalogDetailMinimized />
              </div>
            </BanknoteProvider>


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
