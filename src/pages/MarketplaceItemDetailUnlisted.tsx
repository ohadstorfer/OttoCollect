import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketplaceItemById } from "@/services/marketplaceService";
import { MarketplaceItem, UserRank } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ContactSeller } from "@/components/messages/ContactSeller";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

const MarketplaceItemDetailUnlisted = () => {
  console.log('Rendering MarketplaceItemDetailUnlisted component');
  const { id } = useParams<{ id: string }>();
  console.log('MarketplaceItemDetail ID from params:', id);

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['marketplace']);

  // Memoize the fallback function to prevent infinite re-renders
  const tWithFallback = useMemo(() => {
    return (key: string, fallback: string) => {
      const translation = t(key);
      return translation === key ? fallback : translation;
    };
  }, [t]);

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

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
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
          <Tabs defaultValue="obverse" className="mb-6">
                         <TabsList className="mb-4">
               <TabsTrigger value="obverse">{tWithFallback('item.obverseFront', 'Obverse (Front)')}</TabsTrigger>
               <TabsTrigger value="reverse">{tWithFallback('item.reverseBack', 'Reverse (Back)')}</TabsTrigger>
             </TabsList>

            <TabsContent value="obverse">
              <div className="aspect-[4/3] overflow-hidden border">
                <img
                  src={obverseImage || '/placeholder.svg'}
                  alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) - front`}
                  className="w-full h-full object-contain"
                />
              </div>
            </TabsContent>

            <TabsContent value="reverse">
              <div className="aspect-[4/3] overflow-hidden border">
                <img
                  src={reverseImage || '/placeholder.svg'}
                  alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) - back`}
                  className="w-full h-full object-contain"
                />
              </div>
            </TabsContent>
          </Tabs>

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
        </div>

        {/* Right column: Details */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-parchment-500 mb-2">
                <span> {banknote.denomination} </span>
              </h2>

                             <h2 className="text-2xl font-serif font-bold text-parchment-500 mb-2">
                 <span>{tWithFallback('item.unlistedBanknote', 'Unlisted Banknote')}</span>
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

              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="text-3xl font-bold text-ottoman-500">
                  ${salePrice}
                </div>


              </div>

                             {publicNote && (
                 <div className="mt-4">
                   <p className="text-sm text-ottoman-400">{tWithFallback('item.sellersNote', 'Seller\'s Note')}</p>
                   <p className="mt-1 text-ottoman-200 p-3 bg-ottoman-900/20 rounded-md">
                     {publicNote}
                   </p>
                 </div>
               )}
            </CardContent>
          </Card>

                     {/* Banknote Details */}
           <Card className="border-t-4 border-t-primary shadow-md">
             <CardHeader className="border-b bg-muted/20">
               <div className="flex justify-between items-center">
                 <CardTitle className="text-xl m-0">
                   <span>{tWithFallback('item.banknoteDetails', 'Banknote Details')}</span>
                 </CardTitle>
               </div>
               <CardDescription>
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
    </div>
  );
};

export default MarketplaceItemDetailUnlisted;
