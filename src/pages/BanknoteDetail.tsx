import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Banknote, BanknoteCondition, CollectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { MOCK_BANKNOTES, MOCK_COLLECTION_ITEMS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookmarkPlus, MessageCircle, PlusCircle, Share2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Source types for the banknote detail page
export type BanknoteDetailSource = 'catalog' | 'collection' | 'other-collection' | 'wishlist';

const BanknoteDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get the source context from state or default to catalog
  const source = location.state?.source as BanknoteDetailSource || 'catalog';
  const ownerId = location.state?.ownerId as string;
  
  const [banknote, setBanknote] = useState<Banknote | null>(null);
  const [collectionItem, setCollectionItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  
  // For checking if the user is the owner (for collection view)
  const isOwner = source === 'collection' && user?.id === ownerId;
  
  // For checking if the user is an admin (for editing catalog data)
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  useEffect(() => {
    // Simulate fetching data based on context
    setLoading(true);
    
    // Find the banknote
    const foundBanknote = MOCK_BANKNOTES.find(item => item.id === id);
    
    if (foundBanknote) {
      setBanknote(foundBanknote);
      
      // If viewing from collection, also get collection item details
      if (source === 'collection' || source === 'other-collection') {
        const foundCollectionItem = MOCK_COLLECTION_ITEMS.find(
          item => item.banknoteId === id && 
          (source === 'collection' ? item.userId === user?.id : item.userId === ownerId)
        );
        
        if (foundCollectionItem) {
          setCollectionItem(foundCollectionItem);
        }
      }
    }
    
    setLoading(false);
  }, [id, source, user?.id, ownerId]);

  // Handle the back button text and navigation
  const getBackLinkText = () => {
    switch (source) {
      case 'catalog': return "Back to Catalog";
      case 'collection': return "Back to My Collection";
      case 'other-collection': return "Back to Collections";
      case 'wishlist': return "Back to Wish List";
      default: return "Back";
    }
  };
  
  const handleBack = () => {
    switch (source) {
      case 'catalog':
        navigate('/catalog');
        break;
      case 'collection':
        navigate('/collection');
        break;
      case 'other-collection':
        navigate('/community');
        break;
      case 'wishlist':
        navigate('/collection?tab=wishlist');
        break;
      default:
        navigate(-1);
    }
  };

  // Action handlers
  const handleAddToCollection = () => {
    toast.success("Added to your collection!");
  };
  
  const handleAddToWishlist = () => {
    toast.success("Added to your wishlist!");
  };
  
  const handleRemoveFromCollection = () => {
    toast.success("Removed from your collection");
  };
  
  const handleShareBanknote = () => {
    toast.success("Sharing options opened");
  };
  
  const handleMessageOwner = () => {
    toast.success("Message dialog opened");
  };
  
  const handleSuggestForCatalog = () => {
    toast.success("Your images have been submitted for catalog approval");
  };

  if (loading) {
    return <div className="container py-8">Loading banknote details...</div>;
  }

  if (!banknote) {
    return <div className="container py-8">Banknote not found.</div>;
  }

  return (
    <div className="container py-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink onClick={handleBack}>{getBackLinkText().replace("Back to ", "")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>{banknote.catalogId}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {getBackLinkText()}
        </Button>

        {/* Different action buttons based on source context */}
        <div className="flex gap-2">
          {/* Catalog view actions */}
          {source === 'catalog' && (
            <>
              <Button size="sm" onClick={handleAddToCollection}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add to Collection
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddToWishlist}>
                <BookmarkPlus className="mr-2 h-4 w-4" /> Add to Wishlist
              </Button>
            </>
          )}

          {/* Collection view (owner) actions */}
          {source === 'collection' && isOwner && (
            <>
              <Button size="sm" variant="outline" onClick={handleAddToWishlist}>
                <BookmarkPlus className="mr-2 h-4 w-4" /> Add to Wishlist
              </Button>
              <Button size="sm" variant="outline" onClick={handleShareBanknote}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRemoveFromCollection}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </>
          )}

          {/* Other user's collection actions */}
          {source === 'other-collection' && (
            <>
              <Button size="sm" onClick={handleAddToCollection}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add to My Collection
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddToWishlist}>
                <BookmarkPlus className="mr-2 h-4 w-4" /> Add to Wishlist
              </Button>
              <Button size="sm" onClick={handleMessageOwner}>
                <MessageCircle className="mr-2 h-4 w-4" /> Message Owner
              </Button>
            </>
          )}

          {/* Wishlist view actions */}
          {source === 'wishlist' && (
            <Button size="sm" onClick={handleAddToCollection}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add to Collection
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column - Images */}
        <div className="md:col-span-1">
          <div className="rounded-lg overflow-hidden border bg-card text-card-foreground shadow-sm">
            <div className="p-1">
              <img 
                src={banknote.imageUrls[0] || '/placeholder.svg'} 
                alt={`${banknote.country} ${banknote.denomination} (obverse)`}
                className="w-full h-auto object-contain mb-4"
              />

              {/* Show personal images if in collection view */}
              {(source === 'collection' || source === 'other-collection') && collectionItem?.personalImages && (
                <>
                  <Separator className="my-4" />
                  <h3 className="text-sm font-medium mb-2">Personal Images</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {collectionItem.personalImages.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={`Personal image ${idx+1}`}
                        className="w-full h-auto object-contain rounded"
                      />
                    ))}
                  </div>
                  
                  {/* Upload personal images option (only for collection owner) */}
                  {source === 'collection' && isOwner && (
                    <div className="mt-4">
                      <Button size="sm" className="w-full">
                        Upload Personal Images
                      </Button>
                      <div className="mt-2">
                        <label className="flex items-center space-x-2 my-2">
                          <Checkbox id="suggest-images" />
                          <span className="text-sm font-medium">Submit my images for catalog approval</span>
                        </label>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={handleSuggestForCatalog}
                        >
                          Submit for Approval
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right columns - Details */}
        <div className="md:col-span-2">
          <div className="rounded-lg overflow-hidden border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {banknote.denomination} ({banknote.year})
                    </h1>
                    <p className="text-muted-foreground">{banknote.country}</p>
                    {banknote.series && (
                      <p className="text-sm text-muted-foreground">{banknote.series}</p>
                    )}
                  </div>
                  <div className="flex">
                    <Badge>{banknote.catalogId}</Badge>
                  </div>
                </div>
                <Separator className="my-4" />
              </div>

              {/* Tabs for different sections */}
              <Tabs 
                defaultValue="details" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="space-y-4"
              >
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  {(source === 'collection' || source === 'other-collection') && (
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium">Country</h3>
                      <p className="text-sm text-muted-foreground">{banknote.country}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Denomination</h3>
                      <p className="text-sm text-muted-foreground">{banknote.denomination}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Year</h3>
                      <p className="text-sm text-muted-foreground">{banknote.year}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Series</h3>
                      <p className="text-sm text-muted-foreground">{banknote.series || "N/A"}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="description" className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{banknote.description}</p>
                  </div>
                  
                  {banknote.obverseDescription && (
                    <div>
                      <h3 className="text-sm font-medium">Obverse</h3>
                      <p className="text-sm text-muted-foreground">{banknote.obverseDescription}</p>
                    </div>
                  )}
                  
                  {banknote.reverseDescription && (
                    <div>
                      <h3 className="text-sm font-medium">Reverse</h3>
                      <p className="text-sm text-muted-foreground">{banknote.reverseDescription}</p>
                    </div>
                  )}
                </TabsContent>

                {(source === 'collection' || source === 'other-collection') && (
                  <TabsContent value="personal" className="space-y-4">
                    {collectionItem ? (
                      <>
                        <div>
                          <h3 className="text-sm font-medium">Condition</h3>
                          <p className="text-sm text-muted-foreground">{collectionItem.condition}</p>
                        </div>
                        
                        {/* Purchase info */}
                        <div className="grid grid-cols-2 gap-4">
                          {collectionItem.purchasePrice && (
                            <div>
                              <h3 className="text-sm font-medium">Purchase Price</h3>
                              <p className="text-sm text-muted-foreground">${collectionItem.purchasePrice}</p>
                            </div>
                          )}
                          
                          {collectionItem.purchaseDate && (
                            <div>
                              <h3 className="text-sm font-medium">Purchase Date</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(collectionItem.purchaseDate).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          
                          {collectionItem.location && (
                            <div>
                              <h3 className="text-sm font-medium">Storage Location</h3>
                              <p className="text-sm text-muted-foreground">{collectionItem.location}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Public notes (visible to everyone) */}
                        {collectionItem.publicNote && (
                          <div>
                            <h3 className="text-sm font-medium">Public Notes</h3>
                            <p className="text-sm text-muted-foreground">{collectionItem.publicNote}</p>
                          </div>
                        )}
                        
                        {/* Private notes (only visible to owner) */}
                        {source === 'collection' && isOwner && collectionItem.privateNote && (
                          <div>
                            <h3 className="text-sm font-medium">Private Notes</h3>
                            <p className="text-sm text-muted-foreground">{collectionItem.privateNote}</p>
                          </div>
                        )}
                        
                        {/* Sale information */}
                        {collectionItem.isForSale && (
                          <div className="bg-muted p-3 rounded-md">
                            <h3 className="text-sm font-medium">For Sale</h3>
                            <p className="text-sm text-muted-foreground">
                              Price: ${collectionItem.salePrice}
                            </p>
                          </div>
                        )}
                        
                        {/* Editable fields (only for owner) */}
                        {source === 'collection' && isOwner && (
                          <div className="mt-4 pt-4 border-t">
                            <h3 className="text-sm font-medium mb-2">Edit Personal Information</h3>
                            
                            <div className="space-y-4">
                              <div>
                                <label htmlFor="public-note" className="text-sm font-medium">
                                  Public Note
                                </label>
                                <Textarea 
                                  id="public-note" 
                                  defaultValue={collectionItem.publicNote || ''} 
                                  placeholder="Add public note (visible to others)" 
                                  className="mt-1"
                                />
                              </div>
                              
                              <div>
                                <label htmlFor="private-note" className="text-sm font-medium">
                                  Private Note
                                </label>
                                <Textarea 
                                  id="private-note"
                                  defaultValue={collectionItem.privateNote || ''}
                                  placeholder="Add private note (only visible to you)" 
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="flex justify-end">
                                <Button>Save Changes</Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>No personal information available.</p>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanknoteDetail;
