import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { BanknoteDetailSource } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { addToWishlist, removeFromWishlist, fetchWishlistItem } from "@/services/wishlistService";
import { useToast } from "@/hooks/use-toast";

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
  User,
  Tag,
  Banknote as BanknoteIcon,
  Map,
  History,
  Building,
  Clock,
  CheckCircle,
  ShieldCheck,
  Palette,
  Fingerprint,
  CircleDashed,
  Signature,
  CircleDollarSign,
  StarOff
} from "lucide-react";

interface LabelValuePairProps {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
}

const LabelValuePair: React.FC<LabelValuePairProps> = ({ label, value, icon, iconClassNames }) => {
  if (!value) return null;
  
  return (
    <div className="grid grid-cols-[130px_1fr] gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-right font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center space-x-2">
        {icon && <div className={`text-primary ${iconClassNames}`}>{icon}</div>}
        <span>{value}</span>
      </div>
    </div>
  );
};

const BanknoteFixed = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);

  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (user && banknote) {
        try {
          const result = await fetchWishlistItem(user.id, banknote.id);
          setIsInWishlist(!!result);
        } catch (error) {
          console.error("Error checking wishlist status:", error);
        }
      }
    };
    
    checkWishlistStatus();
  }, [user, banknote]);

  const handleToggleWishlist = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage your wishlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isInWishlist) {
        const success = await removeFromWishlist(user.id, banknote.id);
        if (success) {
          setIsInWishlist(false);
          toast({
            title: "Success",
            description: "Banknote removed from your wishlist.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to remove from wishlist.",
            variant: "destructive",
          });
        }
      } else {
        const success = await addToWishlist(user.id, banknote.id);
        if (success) {
          setIsInWishlist(true);
          toast({
            title: "Success",
            description: "Banknote added to your wishlist.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to add to wishlist.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const getOrganizedImageSrc = (imageUrls: string[] | string | undefined): string => {
    if (!imageUrls) return "/placeholder.svg";
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      return imageUrls[0];
    }
    return typeof imageUrls === 'string' ? imageUrls : "/placeholder.svg";
  };

  if (banknoteLoading) {
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

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const detailGroups = [
    {
      title: "Basic Information",
      icon: <Info className="h-5 w-5" />,
      fields: [
        { label: "Denomination", value: banknote.denomination, icon: <CircleDollarSign className="h-4 w-4" /> },
        { label: "Country", value: banknote.country, icon: <Map className="h-4 w-4" /> },
        { label: "Islamic Year", value: banknote.islamicYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Gregorian Year", value: banknote.gregorianYear, icon: <Calendar className="h-4 w-4" /> },
        { label: "Category", value: banknote.category, icon: <Tag className="h-4 w-4" /> },
        { label: "Type", value: banknote.type, icon: <BanknoteIcon className="h-4 w-4" /> },
        { label: "Sultan", value: banknote.sultanName, icon: <Users className="h-4 w-4" /> }
      ]
    },
    {
      title: "Catalog Information",
      icon: <BookOpen className="h-5 w-5" />,
      fields: [
        { label: "Pick Number", value: banknote.pickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Extended Pick", value: banknote.extendedPickNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Turkish Cat #", value: banknote.turkCatalogNumber, icon: <Hash className="h-4 w-4" /> },
        { label: "Rarity", value: banknote.rarity, icon: <Star className="h-4 w-4" /> }
      ]
    },
    {
      title: "Production Details",
      icon: <Building className="h-5 w-5" />,
      fields: [
        { label: "Printer", value: banknote.printer, icon: <PenTool className="h-4 w-4" /> },
        { label: "Colors", value: banknote.colors, icon: <Palette className="h-4 w-4" /> },
        { label: "Serial Numbering", value: banknote.serialNumbering, icon: <Fingerprint className="h-4 w-4" /> }
      ]
    },
    {
      title: "Security Features",
      icon: <Shield className="h-5 w-5" />,
      fields: [
        { label: "Security Elements", value: banknote.securityElement, icon: <ShieldCheck className="h-4 w-4" /> },
        { label: "Seal Names", value: banknote.sealNames, icon: <Stamp className="h-4 w-4" /> },
        { label: "Front Signatures", value: banknote.signaturesFront, icon: <Signature className="h-4 w-4" /> },
        { label: "Back Signatures", value: banknote.signaturesBack, icon: <Signature className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <div className="page-container max-w-5xl mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
            {banknote.catalogId}
          </Badge>
        </div>
      </div>
      
      <div className="flex flex-col space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {banknote.denomination}
          </h1>
          <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
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
                  {banknote.imageUrls?.length > 0 ? (
                    banknote.imageUrls.slice(0, 4).map((url, index) => (
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
                    <div className="col-span-2 p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  )}
                  
                  {banknote.imageUrls?.length > 4 && (
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
          </div>
          
          <div className="lg:col-span-3">
            <Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-xl">Banknote Details</CardTitle>
                <CardDescription>Complete information about this banknote</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-0">
                  {detailGroups.map((group, groupIndex) => (
                    <AccordionItem 
                      key={`item-${groupIndex}`} 
                      value={`item-${groupIndex}`}
                      className="border rounded-md px-2"
                    >
                      <AccordionTrigger className="hover:no-underline px-4">
                        <div className="flex items-center gap-2">
                          {group.icon}
                          <span className="font-medium">{group.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2">
                          {group.fields
                            .filter(field => field.value !== null && field.value !== undefined)
                            .map((field, fieldIndex) => (
                              <LabelValuePair
                                key={fieldIndex}
                                label={field.label}
                                value={field.value && typeof field.value === 'object' ? field.value.join(', ') : field.value}
                                icon={field.icon}
                              />
                            ))}
                          {!group.fields.some(field => field.value !== null && field.value !== undefined) && (
                            <p className="text-sm text-muted-foreground italic py-2">No information available</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                {(banknote.banknoteDescription || banknote.historicalDescription) && (
                  <div className="mt-6 space-y-4">
                    {banknote.banknoteDescription && (
                      <Card className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/30">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Banknote Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm">
                          {banknote.banknoteDescription}
                        </CardContent>
                      </Card>
                    )}
                    
                    {banknote.historicalDescription && (
                      <Card className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-muted/30">
                          <CardTitle className="text-base flex items-center gap-2">
                            <History className="h-4 w-4" /> Historical Background
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-sm">
                          {banknote.historicalDescription}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="flex gap-3">
            {user ? (
              <Button 
                variant={isInWishlist ? "secondary" : "default"}
                onClick={handleToggleWishlist}
              >
                {isInWishlist ? (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Remove from Wishlist
                  </>
                ) : (
                  <>
                    <StarOff className="h-4 w-4 mr-2" />
                    Add to Wishlist
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')}>Sign in to collect</Button>
            )}
          </div>
        </div>
      </div>
      
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
};

export default BanknoteFixed;
