import React, { useEffect, useState } from 'react';
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
import { BanknoteImage } from '@/components/banknote/BanknoteImage';

interface BanknoteParams {
  id: string;
  [key: string]: string | undefined; // Add index signature
}

const BanknoteCatalogDetailMinimized: React.FC = () => {
  const { id } = useParams<BanknoteParams>();
  const navigate = useNavigate();
  const [banknoteData, setBanknoteData] = useState<DetailedBanknote | null>(null);
  const [source, setSource] = useState<BanknoteDetailSource>('catalog');

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

  const renderBasicInfo = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{banknoteData.denomination} - {banknoteData.country}</CardTitle>
          <CardDescription>
            {banknoteData.year} | {banknoteData.series}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <Badge>{banknoteData.category}</Badge>
            <Badge>{banknoteData.type}</Badge>
          </div>
          <p>{banknoteData.description}</p>
        </CardContent>
      </Card>
    );
  };

  const renderImages = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="aspect-[3/2] relative bg-background border rounded-md overflow-hidden">
          <BanknoteImage
            imageUrl={banknoteData?.imageUrls?.[0] || null}
            alt={`Front of ${banknoteData?.denomination} banknote`}
            className="object-contain w-full h-full"
          />
        </div>
        <div className="aspect-[3/2] relative bg-background border rounded-md overflow-hidden">
          <BanknoteImage 
            imageUrl={banknoteData?.imageUrls?.[1] || null}
            alt={`Back of ${banknoteData?.denomination} banknote`}
            className="object-contain w-full h-full"
          />
        </div>
      </div>
    );
  };

  const renderDetails = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Banknote Details</CardTitle>
          <CardDescription>Additional information about this banknote</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Catalog Information</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Pick Number:</strong> {banknoteData.pickNumber || '-'}
              </div>
              <div>
                <strong>Turk Catalog Number:</strong> {banknoteData.turkCatalogNumber || '-'}
              </div>
              <div>
                <strong>Extended Pick Number:</strong> {banknoteData.extendedPickNumber || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Sultan & Seal Information</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Sultan Name:</strong> {banknoteData.sultanName || '-'}
              </div>
              <div>
                <strong>Seal Names:</strong> {banknoteData.sealNames || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Production Details</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Rarity:</strong> {banknoteData.rarity || '-'}
              </div>
              <div>
                <strong>Printer:</strong> {banknoteData.printer || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Technical Specifications</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Watermark:</strong> {banknoteData.watermark || '-'}
              </div>
              <div>
                <strong>Security Element:</strong> {banknoteData.securityElement || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Descriptions</h3>
            <Separator className="mb-4" />
            <div>
              <strong>Banknote Description:</strong> {banknoteData.banknoteDescription || '-'}
            </div>
            <div>
              <strong>Historical Description:</strong> {banknoteData.historicalDescription || '-'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-10">
      {renderBreadcrumbs()}
      {renderBasicInfo()}
      {renderImages()}
      {renderDetails()}
    </div>
  );
};

export default BanknoteCatalogDetailMinimized;
