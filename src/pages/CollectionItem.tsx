import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { fetchUserCollection } from "@/services/collectionService";
import { useAuth } from "@/context/AuthContext";
import { BanknoteDetailSource } from "@/types";
import type { CollectionItem as CollectionItemType } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
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

export default function CollectionItem() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [collectionItem, setCollectionItem] = useState<CollectionItemType | null>(null);

  const { data: banknote, isLoading: banknoteLoading, isError: banknoteError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  const { data: userCollection, isLoading: collectionLoading } = useQuery({
    queryKey: ["userCollection", user?.id],
    queryFn: () => user ? fetchUserCollection(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  useEffect(() => {
    if (user && userCollection && banknote) {
      const foundItem = userCollection.find(item => item.banknoteId === banknote.id);
      if (foundItem) {
        setCollectionItem(foundItem);
      }
    }
  }, [user, userCollection, banknote]);

  const isLoading = banknoteLoading || collectionLoading;
  const isInCollection = !!collectionItem;

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

  if (!isInCollection) {
    return (
      <div className="page-container max-w-5xl mx-auto py-10">
        <div className="ottoman-card p-8 text-center">
          <h2 className="text-2xl font-serif mb-4">Not in Collection</h2>
          <p className="mb-6 text-muted-foreground">
            This banknote is not in your collection.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const displayImages = [collectionItem.obverseImage, collectionItem.reverseImage].filter(Boolean) as string[];

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
          {collectionItem.isForSale && (
            <Badge variant="destructive" className="text-sm font-medium px-3 py-1">
              For Sale
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex flex-col space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {banknote.denomination}
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          </h1>
          <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <ImagePlus className="h-5 w-5 mr-2" />
                  My Banknote Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {displayImages.length > 0 ? (
                    displayImages.map((url, index) => (
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
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-3">
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
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
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
}
