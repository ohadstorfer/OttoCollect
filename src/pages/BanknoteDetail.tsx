
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { BanknoteDetailSource } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

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
  Image
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
  const { user } = useAuth();

  // State for the dialog
  const [open, setOpen] = useState(false);

  // State for the note text
  const [note, setNote] = useState("");
  
  // State for currently selected image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch banknote detail using react-query
  const { data: banknote, isLoading, isError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  // Mock data for collection item - in a real app would be fetched
  const collectionItem = {
    id: "1",
    userId: "1",
    banknoteId: "1",
    condition: "UNC",
    salePrice: 100,
    isForSale: false,
    publicNote: "Mint condition",
    privateNote: "Stored in a safe",
    purchasePrice: 50,
    purchaseDate: "2023-01-01",
    location: "Safe",
    obverseImage: banknote?.imageUrls?.[0] || "/placeholder.svg",
    reverseImage: banknote?.imageUrls?.[1] || "/placeholder.svg",
    orderIndex: 1,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: "2023-01-01T00:00:00.000Z",
    personalImages: [],
  };

  const isInCollection = false; // Would be determined by a query in real app
  const source: BanknoteDetailSource = "catalog";

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

  if (isError || !banknote) {
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
          {collectionItem?.isForSale && (
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
          <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
        </div>

        {/* Main content grid - Images and details side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Images Gallery - Left side */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  Banknote Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {imageUrls.length > 0 ? (
                    // Display images if available
                    imageUrls.slice(0, 4).map((url, index) => (
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
                  
                  {imageUrls.length > 4 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <div className="relative aspect-[3/2] cursor-pointer bg-muted rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors">
                          <span className="text-lg font-medium">+{imageUrls.length - 4} more</span>
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
                          {imageUrls.map((url, index) => (
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
            
            {/* Description Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {banknote.description && <p>{banknote.description}</p>}
                {banknote.obverseDescription && (
                  <div>
                    <p className="font-medium">Obverse:</p>
                    <p className="text-sm">{banknote.obverseDescription}</p>
                  </div>
                )}
                {banknote.reverseDescription && (
                  <div>
                    <p className="font-medium">Reverse:</p>
                    <p className="text-sm">{banknote.reverseDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Collection Item Details - will only show if user has this in collection */}
            {isInCollection && (
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
                    value={collectionItem?.purchaseDate} 
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {collectionItem?.publicNote && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm italic">{collectionItem.publicNote}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Details Section - Right side */}
          <div className="lg:col-span-3">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Banknote Details</CardTitle>
                <CardDescription>Complete information about this banknote</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 rounded-none">
                    <TabsTrigger value="basic" className="rounded-none">Basic Info</TabsTrigger>
                    <TabsTrigger value="details" className="rounded-none">Details</TabsTrigger>
                    <TabsTrigger value="technical" className="rounded-none">Technical</TabsTrigger>
                  </TabsList>
                  
                  {/* Basic Information Tab */}
                  <TabsContent value="basic" className="p-5 pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <GalleryVertical className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Origin Country</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground">{banknote.country}</span>
                          </div>
                          {banknote.islamicYear && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Islamic Year</span>
                              <span className="font-medium">{banknote.islamicYear}</span>
                            </div>
                          )}
                          {banknote.gregorianYear && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Gregorian Year</span>
                              <span className="font-medium">{banknote.gregorianYear}</span>
                            </div>
                          )}
                          {banknote.year && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Year</span>
                              <span className="font-medium">{banknote.year}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Image className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Identification</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm border-b pb-1">
                            <span className="text-muted-foreground">Denomination</span>
                            <span className="font-medium">{banknote.denomination}</span>
                          </div>
                          {banknote.series && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Series</span>
                              <span className="font-medium">{banknote.series}</span>
                            </div>
                          )}
                          {banknote.catalogId && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Catalog ID</span>
                              <span className="font-medium">{banknote.catalogId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="font-medium">Catalog References</h3>
                        </div>
                        <div className="space-y-2">
                          {banknote.pickNumber && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Pick Number</span>
                              <span className="font-medium">{banknote.pickNumber}</span>
                            </div>
                          )}
                          {banknote.turkCatalogNumber && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Turkish Cat #</span>
                              <span className="font-medium">{banknote.turkCatalogNumber}</span>
                            </div>
                          )}
                          {banknote.extendedPickNumber && (
                            <div className="flex justify-between text-sm border-b pb-1">
                              <span className="text-muted-foreground">Extended Pick</span>
                              <span className="font-medium">{banknote.extendedPickNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {banknote.sultanName && (
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Sultan</p>
                          <p className="text-sm">{banknote.sultanName}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Detailed Information Tab */}
                  <TabsContent value="details" className="p-5 pt-6 space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="history">
                        <AccordionTrigger className="text-base font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Historical Information
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 bg-muted/20 rounded-md">
                          {banknote.historicalDescription ? (
                            <p>{banknote.historicalDescription}</p>
                          ) : (
                            <p className="text-muted-foreground text-sm">No historical information available.</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="design">
                        <AccordionTrigger className="text-base font-medium">
                          <div className="flex items-center gap-2">
                            <GalleryHorizontal className="h-4 w-4" />
                            Design & Appearance
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 p-3 bg-muted/20 rounded-md">
                            {banknote.colors && (
                              <div className="flex gap-2">
                                <span className="font-medium min-w-[90px]">Colors:</span>
                                <span>{banknote.colors}</span>
                              </div>
                            )}
                            {banknote.printer && (
                              <div className="flex gap-2">
                                <span className="font-medium min-w-[90px]">Printer:</span>
                                <span>{banknote.printer}</span>
                              </div>
                            )}
                            {banknote.type && (
                              <div className="flex gap-2">
                                <span className="font-medium min-w-[90px]">Type:</span>
                                <span>{banknote.type}</span>
                              </div>
                            )}
                            {banknote.category && (
                              <div className="flex gap-2">
                                <span className="font-medium min-w-[90px]">Category:</span>
                                <span>{banknote.category}</span>
                              </div>
                            )}
                            {banknote.rarity && (
                              <div className="flex gap-2">
                                <span className="font-medium min-w-[90px]">Rarity:</span>
                                <span>{banknote.rarity}</span>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Additional Information
                      </h3>
                      <Table>
                        <TableBody>
                          {banknote.faceValue && (
                            <TableRow>
                              <TableCell className="text-muted-foreground font-medium">Face Value</TableCell>
                              <TableCell>{banknote.faceValue}</TableCell>
                            </TableRow>
                          )}
                          {banknote.watermarkPicture && (
                            <TableRow>
                              <TableCell className="text-muted-foreground font-medium">Watermark</TableCell>
                              <TableCell>Available</TableCell>
                            </TableRow>
                          )}
                          {banknote.tughraPicture && (
                            <TableRow>
                              <TableCell className="text-muted-foreground font-medium">Tughra</TableCell>
                              <TableCell>Available</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  
                  {/* Technical Tab */}
                  <TabsContent value="technical" className="p-5 pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <PenTool className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-medium">Signatures</h3>
                        </div>
                        
                        {(banknote.signaturesFront || banknote.signaturesBack) ? (
                          <div className="space-y-3">
                            {banknote.signaturesFront && (
                              <div className="bg-muted/20 p-3 rounded-md">
                                <p className="text-sm font-medium mb-1">Front Signatures:</p>
                                <p className="text-sm">{banknote.signaturesFront}</p>
                              </div>
                            )}
                            {banknote.signaturesBack && (
                              <div className="bg-muted/20 p-3 rounded-md">
                                <p className="text-sm font-medium mb-1">Back Signatures:</p>
                                <p className="text-sm">{banknote.signaturesBack}</p>
                              </div>
                            )}
                            {banknote.signaturePictures?.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Signature images available in the gallery
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No signature information available</p>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                          <Stamp className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-medium">Seals</h3>
                        </div>
                        
                        {banknote.sealNames ? (
                          <div className="space-y-3">
                            <div className="bg-muted/20 p-3 rounded-md">
                              <p className="text-sm">{banknote.sealNames}</p>
                            </div>
                            {banknote.sealPictures?.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Seal images available in the gallery
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No seal information available</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-medium">Security Features</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banknote.securityElement && (
                          <div className="bg-muted/20 p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">Security Elements:</p>
                            <p className="text-sm">{banknote.securityElement}</p>
                          </div>
                        )}
                        {banknote.serialNumbering && (
                          <div className="bg-muted/20 p-3 rounded-md">
                            <p className="text-sm font-medium mb-1">Serial Numbering:</p>
                            <p className="text-sm">{banknote.serialNumbering}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex gap-3">
            {isInCollection ? (
              <Button variant="secondary">View in Collection</Button>
            ) : (
              <Button>Add to Collection</Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Note</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add a Note</DialogTitle>
                  <DialogDescription>
                    Write any additional information about this banknote.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Type your note here."
                    className="min-h-[120px]"
                  />
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => {
                      toast("Note saved successfully");
                      setOpen(false);
                    }}
                  >
                    Save Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
