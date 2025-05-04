
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { fetchBanknoteById } from "@/services/catalogService";
import { BanknoteDetailSource, DetailedBanknote } from "@/types";
import { normalizeImageUrls } from "@/utils/imageHelpers";
import BanknoteImageGallery from '@/components/banknotes/BanknoteImageGallery';

// Define types for URL parameters
interface BanknoteParams {
  id: string;
  [key: string]: string | undefined;
}

const BanknoteCatalogDetail: React.FC = () => {
  const { id } = useParams<BanknoteParams>();
  const navigate = useNavigate();
  const [banknoteData, setBanknoteData] = useState<DetailedBanknote | null>(null);
  const [source, setSource] = useState<BanknoteDetailSource>('catalog');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Function to handle opening the image viewer
  const openImageViewer = (imageUrl: string | string[]) => {
    const normalizedUrls = normalizeImageUrls(imageUrl);
    
    if (normalizedUrls.length === 0) return;
    
    setCurrentImageIndex(0);
    setGalleryImages(normalizedUrls);
    setIsViewerOpen(true);
  };

  const { isLoading, error, data } = useQuery({
    queryKey: ['banknote', id],
    queryFn: () => fetchBanknoteById(id!),
  });

  // Update the banknoteData state when data changes
  useEffect(() => {
    if (data) {
      setBanknoteData(data);
    }
  }, [data]);

  useEffect(() => {
    // Determine the source based on the URL
    const path = window.location.pathname;
    if (path.includes('/collection-banknote/')) {
      setSource('collection');
    } else if (path.includes('/marketplace/')) {
      setSource('marketplace');
    } else if (path.includes('/wishlist/')) {
      setSource('wishlist');
    } else {
      setSource('catalog');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
            <CardDescription><Skeleton className="h-4 w-32" /></CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2"><Skeleton className="h-6 w-48" /></h3>
              <Separator className="mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Error loading banknote details</h2>
            <p className="text-muted-foreground">Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!banknoteData) {
    return (
      <div className="container max-w-4xl mx-auto py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Banknote not found</h2>
            <p className="text-muted-foreground">The requested banknote could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderBreadcrumbs = () => {
    return (
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-10">
      {renderBreadcrumbs()}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{banknoteData.denomination} - {banknoteData.country}</CardTitle>
          <CardDescription>
            {banknoteData.year} | {banknoteData.series}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {banknoteData.category && <Badge>{banknoteData.category}</Badge>}
            {banknoteData.type && <Badge>{banknoteData.type}</Badge>}
          </div>
          
          <div className="mt-4">
            <BanknoteImageGallery images={banknoteData.imageUrls} />
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Banknote Details</h3>
            <Separator className="mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="font-medium mb-2">Catalog Information</h4>
                <ul className="space-y-1 text-sm">
                  {banknoteData.pickNumber && (
                    <li><span className="font-medium">Pick Number:</span> {banknoteData.pickNumber}</li>
                  )}
                  {banknoteData.turkCatalogNumber && (
                    <li><span className="font-medium">Turk Catalog Number:</span> {banknoteData.turkCatalogNumber}</li>
                  )}
                  {banknoteData.extendedPickNumber && (
                    <li><span className="font-medium">Extended Pick Number:</span> {banknoteData.extendedPickNumber}</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Historical Information</h4>
                <ul className="space-y-1 text-sm">
                  {banknoteData.sultanName && (
                    <li><span className="font-medium">Sultan Name:</span> {banknoteData.sultanName}</li>
                  )}
                  {banknoteData.sealNames && (
                    <li><span className="font-medium">Seal Names:</span> {banknoteData.sealNames}</li>
                  )}
                </ul>
              </div>
            </div>
            
            {banknoteData.description && (
              <div className="mb-6">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm">{banknoteData.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BanknoteCatalogDetail;
