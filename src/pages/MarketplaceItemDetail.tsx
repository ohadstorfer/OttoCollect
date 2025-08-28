import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, AlertCircle, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketplaceItemById } from "@/services/marketplaceService";
import { MarketplaceItem, UserRank } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ContactSeller } from "@/components/messages/ContactSeller";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import { BanknoteProvider } from "@/context/BanknoteContext";
import ImagePreview from "@/components/shared/ImagePreview";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

const MarketplaceItemDetail = () => {
  console.log('Rendering MarketplaceItemDetail component');
  const { id } = useParams<{ id: string }>();
  console.log('MarketplaceItemDetail ID from params:', id);
  
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageOrientations, setImageOrientations] = useState<Record<number, 'vertical' | 'horizontal'>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { direction } = useLanguage();
  const { t } = useTranslation(['marketplace']);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

  // Image orientation detection function
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

  // Determine image orientations when images change
  useEffect(() => {
    const determineOrientations = async () => {
      if (!item?.collectionItem) return;
      
      const displayImages = [
        item.collectionItem.obverseImage ,
        item.collectionItem.reverseImage
      ].filter(Boolean) as string[];

      const orientations: Record<number, 'vertical' | 'horizontal'> = {};
      
      for (let i = 0; i < displayImages.length; i++) {
        orientations[i] = await getImageOrientation(displayImages[i]);
      }
      
      setImageOrientations(orientations);
    };

    if (item?.collectionItem) {
      determineOrientations();
    }
  }, [item?.collectionItem]);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) {
        console.log('No ID provided in params');
        return;
      }

      console.log('Starting to fetch marketplace item with ID:', id);
      setLoading(true);
      try {
        // We're getting the marketplace item by its ID directly
        const fetchedItem = await getMarketplaceItemById(id);
        console.log('Fetched marketplace item result:', fetchedItem);

        if (!fetchedItem) {
          console.error('Item not found or no longer available');
          setError(tWithFallback('status.itemNotFound', 'Item not found or no longer available'));
          return;
        }

        console.log('Setting marketplace item in state:', fetchedItem);
        setItem(fetchedItem);

      } catch (err) {
        console.error("Error fetching marketplace item:", err);
        setError(tWithFallback('status.failedToLoadItem', 'Failed to load marketplace item'));
        toast({
          title: tWithFallback('status.error', 'Error'),
          description: tWithFallback('status.couldNotLoadDetails', 'Could not load the marketplace item details'),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
        console.log('Finished loading marketplace item');
      }
    };

    fetchItem();
  }, [id, toast]);

  console.log('Current item state:', item);
  console.log('Loading state:', loading);
  console.log('Error state:', error);

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tWithFallback('status.error', 'Error')}</AlertTitle>
          <AlertDescription>
            {error || tWithFallback('status.itemNotFound', 'Item not found or no longer available')}
          </AlertDescription>
        </Alert>

        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tWithFallback('actions.backToMarketplace', 'Back to Marketplace')}
        </Button>
      </div>
    );
  }

  console.log('Rendering marketplace item details with data:', item);
  const { collectionItem, seller, status } = item;
  const { banknote, condition, salePrice, publicNote, privateNote, obverseImage, reverseImage } = collectionItem;

  console.log('Banknote data for detail view:', banknote);
  console.log('Image sources:', { obverseImage, reverseImage, banknoteImages: banknote.imageUrls });

  const sellerRank = seller?.rank || "Newbie";

  // Get display images
  const displayImages = [
    obverseImage || banknote.imageUrls?.[0],
    reverseImage || banknote.imageUrls?.[1]
  ].filter(Boolean) as string[];

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          {direction === 'rtl' ? <ArrowRight className="h-4 w-4 mr-2" /> : <ArrowLeft className="h-4 w-4 mr-2" />}
          {tWithFallback('actions.back', 'Back')}
        </Button>
      </div>

      {/* Status indicator */}
      {/* <div className="mb-6">
        <Badge variant={status === "Available" ? "primary" : status === "Reserved" ? "secondary" : "destructive"}>
          {status}
        </Badge>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Images */}
        <div>
          <Card className="mb-6">
            <CardContent className="px-2 pt-2 pb-2">
              <div className="flex flex-col space-y-3">
                {displayImages.length > 0 ? (
                  <div>
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
                                  <div
                                    className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => openImageViewer(url)}
                                  >
                                    <div className="w-full overflow-hidden border">
                                      <img
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
                                <div
                                  className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openImageViewer(url)}
                                >
                                  <div className="w-full overflow-hidden border">
                                    <img
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
                          <div
                            className="w-full cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openImageViewer(url)}
                          >
                            <div className="w-full overflow-hidden border">
                              <img
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
                     <p className="text-muted-foreground">{tWithFallback('item.noImagesAvailable', 'No images available')}</p>
                   </div>
                 )}
              </div>
            </CardContent>
          </Card>

         
        </div>

        {/* Right column: Details */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-parchment-500 mb-2">
                <span> {banknote.denomination} </span>
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <p className="text-lg text-ottoman-300">
                  {banknote.country}
                  {banknote.country && banknote.year ? ', ' : ''}
                  {banknote.year}
                </p>
                <div className="ml-auto">
                  {collectionItem.condition && !collectionItem.grade && (
                    <Badge variant="secondary">
                      {collectionItem.condition}
                    </Badge>
                  )}
                  {collectionItem.grade && (
                    <Badge variant="secondary">
                      {collectionItem.grade_by && `${collectionItem.grade_by} `}
                      {collectionItem.grade}
                      {collectionItem.grade_condition_description && ` - ${collectionItem.grade_condition_description}`}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="mb-4" />

              <div className="flex items-center justify-between gap-4 mb-1">
                <div className="text-3xl font-bold text-ottoman-500">
                  ${salePrice}
                </div>

                
              </div>

              {/* {publicNote && (
                <div className="mt-4">
                  <p className="text-sm text-ottoman-400">Seller's Note</p>
                  <p className="mt-1 text-ottoman-200 p-3 bg-ottoman-900/20 rounded-md">
                    {publicNote}
                  </p>
                </div>
              )} */}
            </CardContent>


            {/* Seller information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-ottoman-400" />
                  <div>
                    <Link
                      to={`/profile/${seller.id}`}
                      className="text-ottoman-500 hover:text-ottoman-600"
                    >
                      {seller.username} <Badge variant="user" rank={sellerRank as UserRank} role={seller.role} />
                    </Link>
                  </div>
                  
                </div>

                {user && user.id !== seller.id && (
                  <div>
                    <ContactSeller
                      sellerId={seller.id}
                      sellerName={seller.username}
                      itemId={collectionItem.id}
                      itemName={`${banknote.denomination} (${banknote.year})`}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          </Card>

          {/* Wrap the BanknoteCatalogDetailMinimized component with BanknoteProvider */}
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="border-b bg-muted/20">
                             <div className="flex justify-between items-center">
                 <CardTitle className="text-xl m-0">
                   <span>{tWithFallback('item.banknoteDetails', 'Banknote Details')}</span>
                 </CardTitle>
               </div>
               <CardDescription className={`${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                 {tWithFallback('item.detailedInformation', 'Detailed information about this banknote')}
               </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <BanknoteCatalogDetailMinimized 
                banknote={banknote} 
                onImageClick={(url) => setSelectedImage(url)} 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <ImagePreview
        src={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};

export default MarketplaceItemDetail;
