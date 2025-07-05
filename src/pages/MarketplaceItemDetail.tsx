import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, AlertCircle, User } from "lucide-react";
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

const MarketplaceItemDetail = () => {
  console.log('Rendering MarketplaceItemDetail component');
  const { id } = useParams<{ id: string }>();
  console.log('MarketplaceItemDetail ID from params:', id);
  
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

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
          setError("Item not found or no longer available");
          return;
        }

        console.log('Setting marketplace item in state:', fetchedItem);
        setItem(fetchedItem);

      } catch (err) {
        console.error("Error fetching marketplace item:", err);
        setError("Failed to load marketplace item");
        toast({
          title: "Error",
          description: "Could not load the marketplace item details",
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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Item not found or no longer available"}
          </AlertDescription>
        </Alert>

        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
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
          Back
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
              <TabsTrigger value="obverse">Obverse (Front)</TabsTrigger>
              <TabsTrigger value="reverse">Reverse (Back)</TabsTrigger>
            </TabsList>

            <TabsContent value="obverse">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border">
                <img
                  src={obverseImage || banknote.imageUrls[0] || '/placeholder.svg'}
                  alt={`${banknote.country} ${banknote.denomination} (${banknote.year}) - front`}
                  className="w-full h-full object-contain"
                />
              </div>
            </TabsContent>

            <TabsContent value="reverse">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border">
                <img
                  src={reverseImage || banknote.imageUrls[1] || '/placeholder.svg'}
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
                      {seller.username} <Badge variant="user" rank={sellerRank as UserRank} />
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
                  <p className="text-sm text-ottoman-400">Seller's Note</p>
                  <p className="mt-1 text-ottoman-200 p-3 bg-ottoman-900/20 rounded-md">
                    {publicNote}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wrap the BanknoteCatalogDetailMinimized component with BanknoteProvider */}
          <Card className="border-t-4 border-t-primary shadow-md">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl m-0">
                  <span> Banknote Details </span>
                </CardTitle>
              </div>
              <CardDescription>
                Detailed information about this banknote
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

export default MarketplaceItemDetail;
