
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Banknote, DetailedBanknote } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Plus, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchDetailedBanknote } from "@/services/banknoteService";
import { MOCK_BANKNOTES } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type BanknoteDetailSource = 'catalog' | 'collection' | 'other-collection' | 'wish-list' | 'marketplace';

interface LocationState {
  source: BanknoteDetailSource;
  ownerId?: string;
}

const BanknoteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [banknote, setBanknote] = useState<Banknote | null>(null);
  const [detailedBanknote, setDetailedBanknote] = useState<DetailedBanknote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Extract source from location state or default to catalog
  const state = location.state as LocationState;
  const source = state?.source || 'catalog';
  const ownerId = state?.ownerId;
  
  const isOwner = user && ownerId === user.id;
  const isAdmin = user && (user.role === 'Admin' || user.role === 'SuperAdmin');
  
  useEffect(() => {
    const loadBanknote = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Try to fetch detailed banknote from Supabase
        const detailed = await fetchDetailedBanknote(id);
        
        if (detailed) {
          setDetailedBanknote(detailed);
          
          // Create a banknote object from detailed data for display purposes
          const imageUrls: string[] = [];
          if (detailed.front_picture) imageUrls.push(detailed.front_picture);
          if (detailed.back_picture) imageUrls.push(detailed.back_picture);
          if (detailed.seal_pictures && detailed.seal_pictures.length) imageUrls.push(...detailed.seal_pictures);
          if (detailed.tughra_picture) imageUrls.push(detailed.tughra_picture);
          
          const banknoteObj: Banknote = {
            id: detailed.id,
            catalogId: detailed.extended_pick_number || detailed.pick_number,
            country: detailed.country,
            denomination: detailed.face_value,
            year: detailed.gregorian_year || detailed.islamic_year || 'Unknown',
            series: detailed.category,
            description: detailed.banknote_description || `${detailed.face_value} from ${detailed.gregorian_year || detailed.islamic_year}`,
            obverseDescription: detailed.banknote_description,
            reverseDescription: detailed.historical_description,
            imageUrls: imageUrls.length > 0 ? imageUrls : ['/placeholder.svg'],
            isApproved: detailed.is_approved,
            isPending: detailed.is_pending,
            createdAt: detailed.created_at,
            updatedAt: detailed.updated_at,
            createdBy: 'system'
          };
          
          setBanknote(banknoteObj);
        } else {
          // Fall back to mock data if needed
          const mockBanknote = MOCK_BANKNOTES.find(b => b.id === id);
          if (mockBanknote) {
            setBanknote(mockBanknote);
          } else {
            toast({
              title: "Error",
              description: "Banknote not found",
              variant: "destructive",
            });
            navigate(-1);
          }
        }
      } catch (error) {
        console.error("Error loading banknote:", error);
        toast({
          title: "Error",
          description: "Failed to load banknote details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadBanknote();
  }, [id, navigate, toast]);
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  const getBackButtonText = () => {
    switch (source) {
      case 'catalog':
        return 'Back to Catalog';
      case 'collection':
        return 'Back to My Collection';
      case 'other-collection':
        return 'Back to Collection';
      case 'wish-list':
        return 'Back to Wish List';
      case 'marketplace':
        return 'Back to Marketplace';
      default:
        return 'Back';
    }
  };
  
  const handleAddToCollection = () => {
    toast({
      title: "Success",
      description: "Banknote added to your collection",
    });
  };
  
  const handleAddToWishlist = () => {
    toast({
      title: "Success",
      description: "Banknote added to your wishlist",
    });
  };
  
  const handleRemoveFromCollection = () => {
    toast({
      title: "Success",
      description: "Banknote removed from your collection",
    });
  };
  
  const handleMessageOwner = () => {
    toast({
      description: "Message feature coming soon",
    });
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      description: "Link copied to clipboard",
    });
  };
  
  if (loading) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ottoman-600"></div>
      </div>
    );
  }
  
  if (!banknote) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Banknote not found</h1>
        <Button onClick={handleGoBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {getBackButtonText()}
        </Button>
        
        <div className="flex gap-2">
          {source === 'catalog' && (
            <>
              <Button variant="outline" size="sm" onClick={handleAddToCollection}>
                <Plus className="h-4 w-4 mr-2" /> Add to Collection
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddToWishlist}>
                <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
              </Button>
            </>
          )}
          
          {source === 'collection' && isOwner && (
            <>
              <Button variant="outline" size="sm" onClick={handleAddToWishlist}>
                <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
              </Button>
              <Button variant="outline" size="sm" onClick={handleRemoveFromCollection}>
                <Trash2 className="h-4 w-4 mr-2" /> Remove
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </>
          )}
          
          {source === 'other-collection' && (
            <>
              <Button variant="outline" size="sm" onClick={handleMessageOwner}>
                <MessageCircle className="h-4 w-4 mr-2" /> Message Owner
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddToWishlist}>
                <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Images */}
        <div className="lg:col-span-1">
          <div className="mb-4 aspect-square bg-muted rounded-lg overflow-hidden relative">
            <img
              src={banknote.imageUrls[activeImageIndex] || '/placeholder.svg'}
              alt={`${banknote.country} ${banknote.denomination}`}
              className="w-full h-full object-contain"
            />
            {banknote.isApproved && (
              <Badge className="absolute top-2 right-2" variant="secondary">
                Verified
              </Badge>
            )}
          </div>
          
          {banknote.imageUrls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {banknote.imageUrls.map((url, index) => (
                <div 
                  key={index} 
                  className={`aspect-square rounded cursor-pointer border-2 ${activeImageIndex === index ? 'border-primary' : 'border-transparent'}`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img 
                    src={url} 
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right column: Info */}
        <div className="lg:col-span-2">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{banknote.denomination}</h1>
              <p className="text-lg text-muted-foreground">{banknote.country}, {banknote.year}</p>
              {detailedBanknote?.sultan_name && (
                <p className="text-ottoman-600">Sultan: {detailedBanknote.sultan_name}</p>
              )}
            </div>
            <Badge className="mt-2 md:mt-0" variant="gold">{banknote.catalogId}</Badge>
          </div>
          
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              {detailedBanknote && (
                <TabsTrigger value="catalog-info">Catalog Info</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="details">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Country</h4>
                      <p>{banknote.country}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Year</h4>
                      <p>{banknote.year}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Denomination</h4>
                      <p>{banknote.denomination}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Catalog ID</h4>
                      <p>{banknote.catalogId}</p>
                    </div>
                    
                    {detailedBanknote?.category && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                        <p>{detailedBanknote.category}</p>
                      </div>
                    )}
                    {detailedBanknote?.type && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Type</h4>
                        <p>{detailedBanknote.type}</p>
                      </div>
                    )}
                    {detailedBanknote?.rarity && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Rarity</h4>
                        <p>{detailedBanknote.rarity}</p>
                      </div>
                    )}
                    {detailedBanknote?.printer && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Printer</h4>
                        <p>{detailedBanknote.printer}</p>
                      </div>
                    )}
                    {banknote.series && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Series</h4>
                        <p>{banknote.series}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="description">
              <Card>
                <CardContent className="pt-6">
                  {banknote.description && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">{banknote.description}</p>
                    </div>
                  )}
                  
                  {banknote.obverseDescription && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Obverse Description</h4>
                      <p className="text-muted-foreground">{banknote.obverseDescription}</p>
                    </div>
                  )}
                  
                  {banknote.reverseDescription && (
                    <div>
                      <h4 className="font-medium mb-2">Historical Description</h4>
                      <p className="text-muted-foreground">{banknote.reverseDescription}</p>
                    </div>
                  )}
                  
                  {!banknote.description && !banknote.obverseDescription && !banknote.reverseDescription && (
                    <p className="text-muted-foreground">No description available for this banknote.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {detailedBanknote && (
              <TabsContent value="catalog-info">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailedBanknote.pick_number && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Pick Number</h4>
                          <p>{detailedBanknote.pick_number}</p>
                        </div>
                      )}
                      {detailedBanknote.turk_catalog_number && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Turkish Catalog Number</h4>
                          <p>{detailedBanknote.turk_catalog_number}</p>
                        </div>
                      )}
                      {detailedBanknote.islamic_year && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Islamic Year</h4>
                          <p>{detailedBanknote.islamic_year}</p>
                        </div>
                      )}
                      {detailedBanknote.gregorian_year && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Gregorian Year</h4>
                          <p>{detailedBanknote.gregorian_year}</p>
                        </div>
                      )}
                      {detailedBanknote.signatures_front && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Front Signatures</h4>
                          <p>{detailedBanknote.signatures_front}</p>
                        </div>
                      )}
                      {detailedBanknote.signatures_back && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Back Signatures</h4>
                          <p>{detailedBanknote.signatures_back}</p>
                        </div>
                      )}
                      {detailedBanknote.seal_names && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Seal Names</h4>
                          <p>{detailedBanknote.seal_names}</p>
                        </div>
                      )}
                      {detailedBanknote.colors && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Colors</h4>
                          <p>{detailedBanknote.colors}</p>
                        </div>
                      )}
                      {detailedBanknote.serial_numbering && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Serial Numbering</h4>
                          <p>{detailedBanknote.serial_numbering}</p>
                        </div>
                      )}
                      {detailedBanknote.security_element && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-1">Security Element</h4>
                          <p>{detailedBanknote.security_element}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BanknoteDetail;
