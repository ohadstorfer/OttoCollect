
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketplaceItemById } from "@/services/marketplaceService";
import { MarketplaceItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ContactSeller } from "@/components/messages/ContactSeller";
import BanknoteCatalogDetailMinimized from "./BanknoteCatalogDetailMinimized";
import { BanknoteProvider } from "@/context/BanknoteContext";

const MarketplaceItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // We're getting the marketplace item by its ID directly
        const fetchedItem = await getMarketplaceItemById(id);
        
        if (!fetchedItem) {
          setError("Item not found or no longer available");
          return;
        }
        
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
      }
    };

    fetchItem();
  }, [id, toast]);

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

  const { collectionItem, seller, status } = item;
  const { banknote, condition, salePrice, publicNote, privateNote, obverseImage, reverseImage } = collectionItem;

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Marketplace Item Details</h1>
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="mb-6">
        <Badge variant={status === "Available" ? "primary" : status === "Reserved" ? "secondary" : "destructive"}>
          {status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column: Images */}
        <div>
          <Tabs defaultValue="obverse" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="obverse">Obverse (Front)</TabsTrigger>
              <TabsTrigger value="reverse">Reverse (Back)</TabsTrigger>
            </TabsList>
            
            {/* Wrap the BanknoteCatalogDetailMinimized component with BanknoteProvider */}
            <BanknoteProvider banknoteId={banknote.id}>
              <BanknoteCatalogDetailMinimized />
            </BanknoteProvider>
            
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
                    <p className="text-sm font-medium">Seller</p>
                    <Link 
                      to={`/profile/${seller.id}`} 
                      className="text-ottoman-500 hover:text-ottoman-600"
                    >
                      {seller.username}
                    </Link>
                  </div>
                </div>
                
                <Badge variant="user" rank={seller.rank} />
              </div>
              
              {user && user.id !== seller.id && (
                <div className="mt-4">
                  <ContactSeller 
                    sellerId={seller.id}
                    sellerName={seller.username}
                    itemId={collectionItem.id}
                    itemName={`${banknote.denomination} (${banknote.year})`}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Details */}
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-2xl font-serif font-bold text-parchment-500 mb-2">
                {banknote.denomination}
              </h2>
              
              <div className="flex items-center gap-2 mb-4">
                <p className="text-lg text-ottoman-300">
                  {banknote.country}, {banknote.year}
                </p>
                <Badge variant="secondary" className="ml-auto">
                  {condition}
                </Badge>
              </div>
              
              <Separator className="mb-4" />
              
              <div className="text-3xl font-bold mb-6 text-ottoman-500">
                ${salePrice}
              </div>
              
              
              
              {publicNote && (
                <div className="mt-4">
                  <p className="text-sm text-ottoman-400">Seller's Note</p>
                  <p className="mt-1 text-ottoman-200 p-3 bg-ottoman-900/20 rounded-md">
                    {publicNote}
                  </p>
                </div>
              )}
              
              <div className="mt-6">
                <p className="text-sm text-ottoman-400 mb-2">About this banknote</p>
                <p className="text-ottoman-200">
                  {banknote.description || "No description available."}
                </p>
              </div>
              
              {user && user.id !== seller.id && (
                <Button 
                  className="ottoman-button w-full mt-6"
                  onClick={() => {
                    // Navigate to messaging with this seller
                    navigate(`/messaging?user=${seller.id}`);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Seller
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceItemDetail;
