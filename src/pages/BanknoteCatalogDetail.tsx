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
import { DEFAULT_IMAGE_URL } from '@/lib/constants';
import { BanknoteImage } from '@/components/banknote/BanknoteImage';

interface Params {
  id: string;
}

const BanknoteCatalogDetail: React.FC = () => {
  const { id } = useParams<Params>();
  const navigate = useNavigate();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [source, setSource] = useState<BanknoteDetailSource>('catalog');

  const { isLoading, error } = useQuery({
    queryKey: ['banknote', id],
    queryFn: () => fetchBanknoteById(id!),
    onSuccess: (data) => {
      setBanknote(data);
    },
  });

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

  if (!banknote) {
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
          <CardTitle>{banknote.denomination} - {banknote.country}</CardTitle>
          <CardDescription>
            {banknote.year} | {banknote.series}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-2">
            <Badge>{banknote.category}</Badge>
            <Badge>{banknote.type}</Badge>
          </div>
          <p>{banknote.description}</p>
        </CardContent>
      </Card>
    );
  };

  const renderImageGallery = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="aspect-[3/2] bg-background border rounded-md overflow-hidden">
          <BanknoteImage 
            imageUrl={banknote.front_picture} 
            alt={`Front of ${banknote.face_value} banknote`}
          />
        </div>
        <div className="aspect-[3/2] bg-background border rounded-md overflow-hidden">
          <BanknoteImage 
            imageUrl={banknote.back_picture} 
            alt={`Back of ${banknote.face_value} banknote`}
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
                <strong>Pick Number:</strong> {banknote.pick_number || '-'}
              </div>
              <div>
                <strong>Turk Catalog Number:</strong> {banknote.turk_catalog_number || '-'}
              </div>
              <div>
                <strong>Extended Pick Number:</strong> {banknote.extended_pick_number || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Sultan & Seal Information</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Sultan Name:</strong> {banknote.sultan_name || '-'}
              </div>
              <div>
                <strong>Seal Names:</strong> {banknote.seal_names || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Production Details</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Rarity:</strong> {banknote.rarity || '-'}
              </div>
              <div>
                <strong>Printer:</strong> {banknote.printer || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Technical Specifications</h3>
            <Separator className="mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Watermark:</strong> {banknote.watermark || '-'}
              </div>
              <div>
                <strong>Security Element:</strong> {banknote.security_element || '-'}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Descriptions</h3>
            <Separator className="mb-4" />
            <div>
              <strong>Banknote Description:</strong> {banknote.banknote_description || '-'}
            </div>
            <div>
              <strong>Historical Description:</strong> {banknote.historical_description || '-'}
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
      {renderImageGallery()}
      {renderDetails()}
    </div>
  );
};

export default BanknoteCatalogDetail;
