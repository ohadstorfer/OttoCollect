import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketplaceItemById, removeFromMarketplace } from "@/services/marketplaceService";
import { MarketplaceItem, UserRank } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ContactSeller } from "@/components/messages/ContactSeller";
import { BanknoteCatalogDetailMinimized } from "@/components/BanknoteCatalogDetailMinimized";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const MarketplaceItemDetailUnlisted = () => {
  console.log('Rendering MarketplaceItemDetailUnlisted component');
  const { id } = useParams<{ id: string }>();
  console.log('MarketplaceItemDetail ID from params:', id);

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(['marketplace']);
  const { direction } = useLanguage();

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

  const handleRemoveFromMarketplace = async () => {
    if (!item || !user) return;
    
    setIsRemoving(true);
    try {
      const success = await removeFromMarketplace(item.collectionItem.id, item.id);
      if (success) {
        toast({
          title: tWithFallback('actions.removedFromMarketplace', 'Removed from Marketplace'),
          description: tWithFallback('actions.itemRemovedFromMarketplaceDescription', 'Your item has been removed from the marketplace and is no longer for sale.'),
        });
        // Navigate back to collection or marketplace
        navigate('/marketplace');
      } else {
        throw new Error('Failed to remove item from marketplace');
      }
    } catch (error) {
      console.error('Error removing item from marketplace:', error);
      toast({
        title: tWithFallback('status.error', 'Error'),
        description: tWithFallback('actions.failedToRemoveFromMarketplace', 'Failed to remove item from marketplace. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

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
                <Avatar className="h-8 w-8 text-ottoman-400 cursor-pointer" onClick={() => navigate(`/profile/${seller.id}`)} >
                      <AvatarImage src={seller.avatarUrl} />
                      <AvatarFallback>
                        {seller.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
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
                
                {user && user.id === seller.id && (
                  <div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleRemoveFromMarketplace}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          {tWithFallback('actions.removing', 'Removing...')}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {tWithFallback('actions.removeFromMarketplace', 'Remove from Marketplace')}
                        </>
                      )}
                    </Button>
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
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-2xl font-serif font-bold text-parchment-500 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                    <span> {banknote.denomination} </span>
                  </h2>
                  {banknote.extendedPickNumber && (
                    <span className="text-xl font-bold text-black-400">
                      ({banknote.extendedPickNumber})
                    </span>
                  )}
                </div>

                <div className="text-3xl font-bold text-ottoman-500">
                  <span className={`${direction === 'rtl' ? 'text-left' : 'text-right'}`}> ${salePrice} </span>
                </div>
              </div>
              <div className={`mb-2 ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
                <span className="text-sm text-ottoman-400 font-medium">
                  {tWithFallback('item.unlistedBanknote', 'Unlisted Banknote')}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4">


                <div className=" items-center gap-2 ">
                  <p className="text-lg text-ottoman-300">
                    {banknote.country}
                    {banknote.country && banknote.year ? ', ' : ''}
                    {banknote.year}
                  </p>
                  <div
                    className={`mt-2 ${direction === "rtl" ? "text-right" : "text-left"
                      }`}
                  >
                    {collectionItem.condition && !collectionItem.grade && (
                      <Badge variant="secondary">
                        {collectionItem.condition}
                      </Badge>
                    )}
                    {collectionItem.grade && (
                      <Badge variant="secondary">
                        {collectionItem.grade_by && `${collectionItem.grade_by} `}
                        {collectionItem.grade}
                        {collectionItem.grade_condition_description &&
                          ` - ${collectionItem.grade_condition_description}`}
                      </Badge>
                    )}
                  </div>
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
