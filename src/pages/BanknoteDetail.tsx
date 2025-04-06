import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Banknote, DetailedBanknote, BanknoteCondition } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Plus, MessageCircle, Share2, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { fetchDetailedBanknote, fetchBanknoteById } from "@/services/banknoteService";
import { addToCollection, removeFromCollection } from "@/services/collectionService";
import { addToWishlist } from "@/services/wishlistService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  
  const [condition, setCondition] = useState<BanknoteCondition>('UNC');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>('');
  const [publicNote, setPublicNote] = useState<string>('');
  const [privateNote, setPrivateNote] = useState<string>('');
  
  const [isAddToWishlistOpen, setIsAddToWishlistOpen] = useState(false);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [wishlistNote, setWishlistNote] = useState<string>('');
  
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
        console.log("Loading banknote details for:", id);
        
        const detailed = await fetchDetailedBanknote(id);
        const basic = await fetchBanknoteById(id);
        
        if (detailed) {
          setDetailedBanknote(detailed);
          console.log("Loaded detailed banknote:", detailed);
        }
        
        if (basic) {
          setBanknote(basic);
          console.log("Loaded basic banknote:", basic);
        } else {
          toast({
            title: "Error",
            description: "Banknote not found",
            variant: "destructive",
          });
          navigate(-1);
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
  
  const handleAddToCollectionSubmit = async () => {
    if (!user || !banknote) return;
    
    try {
      const result = await addToCollection(
        user.id,
        banknote.id,
        condition,
        purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchaseDate || undefined,
        publicNote || undefined,
        privateNote || undefined
      );
      
      if (result) {
        toast({
          title: "Success",
          description: `${banknote.denomination} added to your collection`,
        });
        setIsAddToCollectionOpen(false);
        
        setCondition('UNC');
        setPurchasePrice('');
        setPurchaseDate('');
        setPublicNote('');
        setPrivateNote('');
      } else {
        toast({
          title: "Error",
          description: "Failed to add banknote to collection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding to collection:", error);
      toast({
        title: "Error",
        description: "Failed to add banknote to collection",
        variant: "destructive",
      });
    }
  };
  
  const handleAddToWishlistSubmit = async () => {
    if (!user || !banknote) return;
    
    try {
      const result = await addToWishlist(
        user.id,
        banknote.id,
        priority,
        wishlistNote || undefined
      );
      
      if (result) {
        toast({
          title: "Success",
          description: `${banknote.denomination} added to your wishlist`,
        });
        setIsAddToWishlistOpen(false);
        
        setPriority('Medium');
        setWishlistNote('');
      } else {
        toast({
          title: "Error",
          description: "Failed to add banknote to wishlist",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast({
        title: "Error",
        description: "Failed to add banknote to wishlist",
        variant: "destructive",
      });
    }
  };
  
  const handleRemoveFromCollection = async (collectionItemId: string) => {
    if (!user) return;
    
    try {
      const success = await removeFromCollection(collectionItemId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Banknote removed from your collection",
        });
        navigate(-1);
      } else {
        toast({
          title: "Error",
          description: "Failed to remove banknote from collection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing from collection:", error);
      toast({
        title: "Error",
        description: "Failed to remove banknote from collection",
        variant: "destructive",
      });
    }
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
          {source === 'catalog' && user && (
            <>
              <Dialog open={isAddToCollectionOpen} onOpenChange={setIsAddToCollectionOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Add to Collection
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to Your Collection</DialogTitle>
                    <DialogDescription>
                      Add details about this banknote in your collection.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="condition" className="text-right">Condition</Label>
                      <Select 
                        value={condition} 
                        onValueChange={(value) => setCondition(value as BanknoteCondition)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNC">UNC</SelectItem>
                          <SelectItem value="AU">AU</SelectItem>
                          <SelectItem value="XF">XF</SelectItem>
                          <SelectItem value="VF">VF</SelectItem>
                          <SelectItem value="F">F</SelectItem>
                          <SelectItem value="VG">VG</SelectItem>
                          <SelectItem value="G">G</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="purchasePrice" className="text-right">Purchase Price</Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        placeholder="Enter price"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="purchaseDate" className="text-right">Purchase Date</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="publicNote" className="text-right">Public Note</Label>
                      <Textarea
                        id="publicNote"
                        placeholder="Visible to other users"
                        value={publicNote}
                        onChange={(e) => setPublicNote(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="privateNote" className="text-right">Private Note</Label>
                      <Textarea
                        id="privateNote"
                        placeholder="Only visible to you"
                        value={privateNote}
                        onChange={(e) => setPrivateNote(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleAddToCollectionSubmit}>Add to Collection</Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isAddToWishlistOpen} onOpenChange={setIsAddToWishlistOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to Your Wishlist</DialogTitle>
                    <DialogDescription>
                      Add this banknote to your wishlist.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">Priority</Label>
                      <Select 
                        value={priority} 
                        onValueChange={(value) => setPriority(value as 'Low' | 'Medium' | 'High')}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="note" className="text-right">Note</Label>
                      <Textarea
                        id="note"
                        placeholder="Add a note"
                        value={wishlistNote}
                        onChange={(e) => setWishlistNote(e.target.value)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleAddToWishlistSubmit}>Add to Wishlist</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          {source === 'collection' && isOwner && state && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddToWishlistOpen(true)}
              >
                <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveFromCollection(state.ownerId!)}
              >
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddToWishlistOpen(true)}
              >
                <Heart className="h-4 w-4 mr-2" /> Add to Wishlist
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
