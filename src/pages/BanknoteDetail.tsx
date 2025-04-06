
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
import { toast } from "sonner";

import { Calendar, BookOpen, Users, PenTool, Stamp, Hash, Shield, ArrowLeft, Info, Star, DollarSign, ImagePlus } from "lucide-react";

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
                  {banknote.imageUrls.slice(0, 4).map((url, index) => (
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
                  
                  {banknote.imageUrls.length > 4 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <div className="relative aspect-[3/2] cursor-pointer bg-muted rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors">
                          <span className="text-lg font-medium">+{banknote.imageUrls.length - 4} more</span>
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
                          {banknote.imageUrls.map((url, index) => (
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
                  <Info className="h-5 w-5 mr-2" />
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
          <div className="lg:col-span-3 space-y-4">
            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Details about the banknote's origin and issuance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <LabelValuePair label="Country" value={banknote.country} />
                  <LabelValuePair label="Denomination" value={banknote.denomination} />
                  <LabelValuePair label="Year" value={banknote.year} />
                  <LabelValuePair label="Series" value={banknote.series} />
                  <LabelValuePair label="Catalog ID" value={banknote.catalogId} />
                </div>
              </CardContent>
            </Card>
            
            {/* Detailed Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detailed Information</CardTitle>
                <CardDescription>Technical details and catalog references</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <LabelValuePair 
                    label="Sultan" 
                    value={banknote.sultanName}
                    icon={<Users className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Pick #" 
                    value={banknote.pickNumber}
                    icon={<BookOpen className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Turkish #" 
                    value={banknote.turkCatalogNumber}
                    icon={<BookOpen className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Islamic Yr" 
                    value={banknote.islamicYear}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Gregorian Yr" 
                    value={banknote.gregorianYear}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Technical Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Technical Details</CardTitle>
                <CardDescription>Signatures, seals and security features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <LabelValuePair 
                    label="Front Sigs" 
                    value={banknote.signaturesFront}
                    icon={<PenTool className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Back Sigs" 
                    value={banknote.signaturesBack}
                    icon={<PenTool className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Seals" 
                    value={banknote.sealNames}
                    icon={<Stamp className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Serial #" 
                    value={banknote.serialNumbering}
                    icon={<Hash className="h-4 w-4" />}
                  />
                  <LabelValuePair 
                    label="Security" 
                    value={banknote.securityElement}
                    icon={<Shield className="h-4 w-4" />}
                  />
                </div>
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
