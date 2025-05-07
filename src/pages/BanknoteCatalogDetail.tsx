
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBanknoteDetail } from "@/services/banknoteService";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Users,
  PenTool,
  Stamp,
  Hash,
  Shield,
  Info
} from "lucide-react";
import { BanknoteDetailSource, BanknoteWithImages } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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

export default function BanknoteCatalogDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [source, setSource] = useState<BanknoteDetailSource>("catalog");

  const { data: banknote, isLoading, isError } = useQuery({
    queryKey: ["banknoteDetail", id],
    queryFn: () => fetchBanknoteDetail(id || ""),
    enabled: !!id,
  });

  useEffect(() => {
    // Set page title based on banknote data
    if (banknote) {
      document.title = `${banknote.denomination} (${banknote.year}) - Ottoman Banknotes`;
    } else {
      document.title = "Banknote Details - Ottoman Banknotes";
    }
  }, [banknote]);

  useEffect(() => {
    // Determine source based on URL
    const path = window.location.pathname;
    if (path.includes("catalog-banknote")) {
      setSource("catalog");
    } else if (path.includes("banknote-details")) {
      setSource("details");
    }
  }, []);

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

  const openImageViewer = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Fix: Handle the case where imageUrls could be an array or a string
  const displayImages = Array.isArray(banknote.imageUrls) ? banknote.imageUrls : 
    (banknote.imageUrls ? [banknote.imageUrls] : []);

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
          {banknote.rarity && (
            <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
              {banknote.rarity}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="flex flex-col space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{banknote.denomination}</h1>
          <p className="text-xl text-muted-foreground">{banknote.country}, {banknote.year}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Banknote Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
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
                    <div className="p-6 text-center bg-muted rounded-md">
                      <p className="text-muted-foreground">No images available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {user && (
              <div className="flex flex-col space-y-2 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/add-to-collection/${id}`)}
                >
                  Add to My Collection
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/add-to-wishlist/${id}`)}
                >
                  Add to Wishlist
                </Button>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" /> Banknote Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-1">
                  <LabelValuePair label="Denomination" value={banknote.denomination} />
                  <LabelValuePair label="Country" value={banknote.country} />
                  <LabelValuePair label="Year" value={banknote.year} />
                  <LabelValuePair 
                    label="Pick Number" 
                    value={banknote.pickNumber} 
                    icon={<Hash size={16} />}
                    iconClassNames="text-blue-500"
                  />
                  <LabelValuePair 
                    label="Catalog ID" 
                    value={banknote.extendedPickNumber} 
                    icon={<Hash size={16} />}
                    iconClassNames="text-blue-500"
                  />
                  
                  {banknote.type && (
                    <LabelValuePair 
                      label="Type" 
                      value={banknote.type}
                    />
                  )}
                  
                  {banknote.category && (
                    <LabelValuePair 
                      label="Category" 
                      value={banknote.category}
                    />
                  )}
                  
                  {banknote.printer && (
                    <LabelValuePair 
                      label="Printer" 
                      value={banknote.printer} 
                      icon={<PenTool size={16} />}
                      iconClassNames="text-green-500"
                    />
                  )}
                  
                  {banknote.sultanName && (
                    <LabelValuePair 
                      label="Sultan" 
                      value={banknote.sultanName} 
                      icon={<Users size={16} />}
                      iconClassNames="text-purple-500"
                    />
                  )}
                  
                  {banknote.rarity && (
                    <LabelValuePair 
                      label="Rarity" 
                      value={banknote.rarity} 
                      icon={<Shield size={16} />}
                      iconClassNames="text-yellow-500"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {(banknote.banknoteDescription || banknote.historicalDescription) && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Info className="h-5 w-5 mr-2" /> Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {banknote.banknoteDescription && (
                      <AccordionItem value="banknote-desc">
                        <AccordionTrigger className="text-base font-medium">Banknote Description</AccordionTrigger>
                        <AccordionContent>
                          <div className="prose max-w-none text-sm">
                            <p>{banknote.banknoteDescription}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    
                    {banknote.historicalDescription && (
                      <AccordionItem value="historical-desc">
                        <AccordionTrigger className="text-base font-medium">Historical Background</AccordionTrigger>
                        <AccordionContent>
                          <div className="prose max-w-none text-sm">
                            <p>{banknote.historicalDescription}</p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Technical Details */}
            {(banknote.signaturesFront || banknote.signaturesBack || banknote.sealNames || banknote.securityElement || banknote.colors || banknote.serialNumbering) && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Stamp className="h-5 w-5 mr-2" /> Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-1">
                    {banknote.signaturesFront && (
                      <LabelValuePair label="Front Signatures" value={banknote.signaturesFront} />
                    )}
                    
                    {banknote.signaturesBack && (
                      <LabelValuePair label="Back Signatures" value={banknote.signaturesBack} />
                    )}
                    
                    {banknote.sealNames && (
                      <LabelValuePair label="Seal Names" value={banknote.sealNames} />
                    )}
                    
                    {banknote.securityElement && (
                      <LabelValuePair label="Security Elements" value={banknote.securityElement} />
                    )}
                    
                    {banknote.colors && (
                      <LabelValuePair label="Colors" value={banknote.colors} />
                    )}
                    
                    {banknote.serialNumbering && (
                      <LabelValuePair label="Serial Numbering" value={banknote.serialNumbering} />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-8">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        
        {user && (
          <div className="flex space-x-2">
            <Button onClick={() => navigate(`/add-to-collection/${id}`)}>
              Add to Collection
            </Button>
          </div>
        )}
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
