
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { BanknoteDetailSource, CollectionItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { fetchUserCollection } from "@/services/collectionService";
import CollectionItemForm from "@/components/collection/CollectionItemForm";

import { 
  Calendar, 
  BookOpen, 
  Users, 
  PenTool, 
  Stamp, 
  Hash, 
  Shield, 
  ArrowLeft, 
  Info, 
  Star, 
  DollarSign, 
  ImagePlus, 
  FileText,
  GalleryHorizontal,
  GalleryVertical,
  Image,
  User
} from "lucide-react";

// Define a functional component called LabelValuePair
interface LabelValuePairProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  if (!value) return null; // Don't render if no value
  
  return (
    <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-right font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center space-x-2">
        {icon && <div className={`text-primary ${iconClassNames}`}>{icon}</div>}
        <span>{value}</span>
      </div>
    </div>
  );
};

export default function BanknoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'catalog' | 'collection'>('catalog');
  const [collectionItem, setCollectionItem] = useState<CollectionItem | null>(null);

  // Fetch banknote detail using react-query
  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  // Fetch user's collection to check if this banknote is in it
  const { data: userCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["userCollection", user?.id],
    queryFn: () => user ? fetchUserCollection(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  // Check if the banknote is in the user's collection
  useEffect(() => {
    if (user && userCollection && banknote) {
      const foundItem = userCollection.find(item => item.banknoteId === banknote.id);
      if (foundItem) {
        setCollectionItem(foundItem);
        
        // If we came from the collection or if the URL has the source param
        const sourceParam = new URLSearchParams(location.search).get('source');
        if (sourceParam === 'collection' || location.state?.source === 'collection') {
          setViewMode('collection');
        }
      }
    }
  }, [user, userCollection, banknote, location]);

  const isLoading = banknoteLoading || collectionLoading;
  const isInCollection = !!collectionItem;
  
  // Helper function to toggle between catalog and collection view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'catalog' ? 'collection' : 'catalog');
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

  if (banknoteError || !banknote) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Error Loading Banknote</h2>
          <p className="mb-6 text-muted-foreground">
            We couldn't load the banknote details. Please try again later.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // Update the role comparison check
  if (user?.role !== 'Super Admin' && user?.role !== 'Admin' && !isInCollection && banknote?.isPending) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <h1 className="page-title">Banknote Details</h1>
        <div className="max-w-2xl mx-auto text-center">
          <div className="ottoman-card p-8 flex flex-col items-center">
            <h2 className="text-2xl font-serif mb-4">Pending Approval</h2>
            <p className="mb-6 text-muted-foreground">
              This banknote is pending administrator approval.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper function to open image viewer
  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };
  
  // Make sure imageUrls is an array, provide default if it's not
  const imageUrls = Array.isArray(banknote.imageUrls) ? banknote.imageUrls : [];

  // Determine which images to show based on view mode
  const displayImages = viewMode === 'collection' && collectionItem ? 
    [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[] : 
    imageUrls;
  
  return (
    <div className="page-container max-w-5xl mx-auto py-10">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
            {banknote.catalogId}
          </Badge>
          {isInCollection && collectionItem?.isForSale && (
            <Badge variant="destructive" className="text-sm font-medium px-3 py-1">
              For Sale
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex flex-col space-y-6">
        {/* Title and basic info */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {banknote.denomination}
            {isInCollection && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
            {isInCollection && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleViewMode} 
                className="gap-2"
              >
                {viewMode === 'catalog' ? 'View My Copy' : 'View Catalog Entry'}
              </Button>
            )}
          </div>
        </div>

        {/* Main content grid - Images and details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Images Gallery - Left side */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  {viewMode === 'collection' ? 'My Banknote Images' : 'Banknote Images'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {displayImages.length > 0 ? (
                    // Display images if available
                    displayImages.slice(0, 4).map((url, index) => (
                      <div 
                        key={index} 
                        className="relative aspect-[3/2] cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openImageViewer(url)}
                      >
                        <div className="absolute inset-0 rounded-md overflow-hidden border">
                          <img
                            src={url}
                            alt={`Banknote Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    // Display placeholder if no images
                    <div className="col-span-2 p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  )}
                  
                  {displayImages.length > 4 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <div className="relative aspect-[3/2] cursor-pointer bg-muted rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors">
                          <span className="text-lg font-medium">+{displayImages.length - 4} more</span>
                        </div>
                      </SheetTrigger>
                      <SheetContent className="w-[90%] sm:max-w-lg">
                        <SheetHeader>
                          <SheetTitle>All Banknote Images</SheetTitle>
                          <SheetDescription>
                            {banknote.country}, {banknote.denomination}, {banknote.year}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="grid grid-cols-2 gap-4 mt-8">
                          {displayImages.map((url, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-[3/2] cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openImageViewer(url)}
                            >
                              <div className="absolute inset-0 rounded-md overflow-hidden border">
                                <img
                                  src={url}
                                  alt={`Banknote Image ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Collection Item Details - will only show if user has this in collection */}
            {isInCollection && viewMode === 'catalog' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Your Collection Item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <LabelValuePair 
                    label="Condition" 
                    value={collectionItem?.condition} 
                  />
                  {collectionItem?.isForSale && (
                    <LabelValuePair 
                      label="Sale Price" 
                      value={`$${collectionItem.salePrice}`}
                      icon={<DollarSign className="h-4 w-4" />}
                    />
                  )}
                  <LabelValuePair 
                    label="Acquired" 
                    value={collectionItem?.purchaseDate ? new Date(collectionItem.purchaseDate).toLocaleDateString() : undefined} 
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {collectionItem?.publicNote && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm italic">{collectionItem.publicNote}</p>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleViewMode} 
                      className="w-full"
                    >
                      Switch to Collection View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creator Information (shown only on catalog view) */}
            {viewMode === 'catalog' && banknote.createdBy && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Added By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link 
                    to={`/profile/${banknote.createdBy}`}
                    className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-md transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">View Profile</p>
                      <p className="text-sm text-muted-foreground">See this collector's other contributions</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Details Section - Right side */}
          <div className="lg:col-span-3">
            {viewMode === 'collection' && isInCollection ? (
              // Collection View - Edit Collection Item
              <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-xl">My Collection Copy</CardTitle>
                  <CardDescription>Details about your copy of this banknote</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <CollectionItemForm 
                    collectionItem={collectionItem} 
                    onUpdate={(updatedItem) => setCollectionItem(updatedItem)}
                  />
                </CardContent>
              </Card>
            ) : (
              // Catalog View - Banknote Details - UPDATED VERSION
              <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-xl">Banknote Details</CardTitle>
                  <CardDescription>Complete information about this banknote</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Details Section with clean presentation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      {/* Origin and Dating Info */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium flex items-center gap-2 pb-2 border-b">
                          <Calendar className="h-5 w-5 text-primary" />
                          Dating & Origin
                        </h3>
                        <div className="space-y-3 pl-2">
                          {banknote.country && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Country:</span>
                              <span className="font-medium">{banknote.country}</span>
                            </div>
                          )}
                          {banknote.islamicYear && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Islamic Year:</span>
                              <span className="font-medium">{banknote.islamicYear}</span>
                            </div>
                          )}
                          {banknote.gregorianYear && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Gregorian Year:</span>
                              <span className="font-medium">{banknote.gregorianYear}</span>
                            </div>
                          )}
                          {banknote.year && banknote.year !== banknote.gregorianYear && banknote.year !== banknote.islamicYear && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Year:</span>
                              <span className="font-medium">{banknote.year}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Identification Info */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium flex items-center gap-2 pb-2 border-b">
                          <BookOpen className="h-5 w-5 text-primary" />
                          Identification
                        </h3>
                        <div className="space-y-3 pl-2">
                          {banknote.pickNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Pick Number:</span>
                              <span className="font-medium">{banknote.pickNumber}</span>
                            </div>
                          )}
                          {banknote.extendedPickNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Extended Pick:</span>
                              <span className="font-medium">{banknote.extendedPickNumber}</span>
                            </div>
                          )}
                          {banknote.turkCatalogNumber && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Turkish Cat #:</span>
                              <span className="font-medium">{banknote.turkCatalogNumber}</span>
                            </div>
                          )}
                          {banknote.denomination && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Denomination:</span>
                              <span className="font-medium">{banknote.denomination}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Appearance & Production */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium flex items-center gap-2 pb-2 border-b">
                          <GalleryHorizontal className="h-5 w-5 text-primary" />
                          Appearance & Production
                        </h3>
                        <div className="space-y-3 pl-2">
                          {banknote.printer && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Printer:</span>
                              <span className="font-medium">{banknote.printer}</span>
                            </div>
                          )}
                          {banknote.type && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium">{banknote.type}</span>
                            </div>
                          )}
                          {banknote.colors && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Colors:</span>
                              <span className="font-medium">{banknote.colors}</span>
                            </div>
                          )}
                          {banknote.category && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Category:</span>
                              <span className="font-medium">{banknote.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Historical Context */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium flex items-center gap-2 pb-2 border-b">
                          <Users className="h-5 w-5 text-primary" />
                          Historical Context
                        </h3>
                        <div className="space-y-3 pl-2">
                          {banknote.sultanName && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sultan:</span>
                              <span className="font-medium">{banknote.sultanName}</span>
                            </div>
                          )}
                          {banknote.series && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Series:</span>
                              <span className="font-medium">{banknote.series}</span>
                            </div>
                          )}
                          {banknote.rarity && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rarity:</span>
                              <span className="font-medium">{banknote.rarity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Security & Technical Features */}
                    {(banknote.sealNames || banknote.securityElement || banknote.serialNumbering || 
                     banknote.signaturesFront || banknote.signaturesBack) && (
                      <div className="mt-6 pt-4 border-t">
                        <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                          <Shield className="h-5 w-5 text-primary" />
                          Security & Technical Features
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {banknote.sealNames && (
                            <div className="p-3 bg-muted/20 rounded-md">
                              <p className="text-sm font-medium mb-1">Seals:</p>
                              <p className="text-sm">{banknote.sealNames}</p>
                            </div>
                          )}
                          
                          {banknote.securityElement && (
                            <div className="p-3 bg-muted/20 rounded-md">
                              <p className="text-sm font-medium mb-1">Security Elements:</p>
                              <p className="text-sm">{banknote.securityElement}</p>
                            </div>
                          )}
                          
                          {banknote.serialNumbering && (
                            <div className="p-3 bg-muted/20 rounded-md">
                              <p className="text-sm font-medium mb-1">Serial Numbering:</p>
                              <p className="text-sm">{banknote.serialNumbering}</p>
                            </div>
                          )}
                          
                          {(banknote.signaturesFront || banknote.signaturesBack) && (
                            <div className="p-3 bg-muted/20 rounded-md">
                              <p className="text-sm font-medium mb-1">Signatures:</p>
                              {banknote.signaturesFront && (
                                <p className="text-sm">Front: {banknote.signaturesFront}</p>
                              )}
                              {banknote.signaturesBack && (
                                <p className="text-sm mt-1">Back: {banknote.signaturesBack}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Historical Description */}
                    {banknote.historicalDescription && (
                      <div className="mt-6 pt-4 border-t">
                        <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                          <BookOpen className="h-5 w-5 text-primary" />
                          Historical Background
                        </h3>
                        <div className="p-4 bg-muted/10 rounded-lg text-sm">
                          {banknote.historicalDescription}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex gap-3">
            {viewMode === 'catalog' && (
              isInCollection ? (
                <Button 
                  variant="secondary" 
                  onClick={toggleViewMode}
                >
                  View in Collection
                </Button>
              ) : user ? (
                <Button>Add to Collection</Button>
              ) : (
                <Button onClick={() => navigate('/auth')}>Sign in to collect</Button>
              )
            )}
            {viewMode === 'collection' && (
              <Button variant="secondary" onClick={toggleViewMode}>
                View Catalog Entry
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Full Image Viewer Dialog */}
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
