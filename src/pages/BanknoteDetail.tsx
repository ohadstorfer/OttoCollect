import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBanknoteById } from '@/services/banknoteService';
import { BanknoteImage } from '@/components/banknote/BanknoteImage';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import SEOHead from '@/components/seo/SEOHead';

interface BanknoteDetailParams {
  id: string;
  [key: string]: string | undefined; // Add index signature for compatibility
}

const BanknoteDetail: React.FC = () => {
  const { id } = useParams<BanknoteDetailParams>();
  const navigate = useNavigate();

  const { data: banknote, isLoading, error } = useQuery({
    queryKey: ['banknote', id],
    queryFn: () => fetchBanknoteById(id!),
  });

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
            <h2 className="text-2xl font-semibold mb-4"><span>Banknote not found</span></h2>
            <p className="text-muted-foreground">The requested banknote could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate comprehensive SEO data for this banknote detail page
  const seoData = {
    title: `${banknote.denomination} ${banknote.country} ${banknote.year} | OttoCollect`,
    description: `Authentic ${banknote.denomination} ${banknote.country} banknote from ${banknote.year}. Pick number: ${banknote.pickNumber}. ${banknote.authorityName ? `Issued by ${banknote.authorityName}.` : ''} ${banknote.description ? `${banknote.description.substring(0, 100)}...` : ''} Rare historical currency for serious collectors and numismatists.`,
    keywords: [
      `${banknote.denomination} ${banknote.country}`,
      `${banknote.year} ${banknote.country} banknote`,
      `Pick ${banknote.pickNumber}`,
      'Ottoman Empire banknote',
      'historical currency',
      'rare banknote',
      'collector banknote',
      'numismatics',
      banknote.authorityName || '',
      banknote.series || '',
      banknote.category || '',
      banknote.type || '',
      banknote.printer || '',
      banknote.watermark || ''
    ].filter(Boolean),
    canonical: `https://ottocollect.com/catalog-banknote/${id}`,
    image: banknote.imageUrls?.[0] || '/placeholder.svg',
    type: 'product' as const,
    banknoteData: {
      id: banknote.id,
      country: banknote.country,
      denomination: banknote.denomination,
      year: banknote.year?.toString(),
      extendedPickNumber: banknote.pickNumber,
      authorityName: banknote.authorityName,
      series: banknote.series,
      category: banknote.category,
      type: banknote.type,
      printer: banknote.printer,
      watermark: banknote.watermark,
      description: banknote.description
    },
    // Enhanced structured data for better Google indexing
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": `${banknote.denomination} ${banknote.country} Banknote ${banknote.year}`,
      "description": banknote.description || `Authentic ${banknote.denomination} ${banknote.country} banknote from ${banknote.year}`,
      "image": banknote.imageUrls?.map((url, index) => ({
        "@type": "ImageObject",
        "url": url,
        "name": `${banknote.denomination} ${banknote.country} ${index === 0 ? 'Front' : 'Back'}`,
        "description": `${banknote.denomination} ${banknote.country} banknote ${index === 0 ? 'front side' : 'back side'} from ${banknote.year}`,
        "caption": `${banknote.denomination} ${banknote.country} banknote ${index === 0 ? 'obverse' : 'reverse'} design`
      })) || [],
      "url": `https://ottocollect.com/catalog-banknote/${id}`,
      "brand": {
        "@type": "Brand",
        "name": banknote.country
      },
      "category": "Collectible Currency",
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Year",
          "value": banknote.year?.toString()
        },
        {
          "@type": "PropertyValue",
          "name": "Pick Number",
          "value": banknote.pickNumber
        },
        {
          "@type": "PropertyValue",
          "name": "Country",
          "value": banknote.country
        },
        {
          "@type": "PropertyValue",
          "name": "Series",
          "value": banknote.series || "N/A"
        },
        {
          "@type": "PropertyValue",
          "name": "Category",
          "value": banknote.category || "N/A"
        },
        {
          "@type": "PropertyValue",
          "name": "Type",
          "value": banknote.type || "N/A"
        },
        {
          "@type": "PropertyValue",
          "name": "Printer",
          "value": banknote.printer || "N/A"
        },
        {
          "@type": "PropertyValue",
          "name": "Watermark",
          "value": banknote.watermark || "N/A"
        }
      ],
      "isPartOf": {
        "@type": "Collection",
        "name": `${banknote.country} Banknote Catalog`,
        "url": `https://ottocollect.com/catalog/${encodeURIComponent(banknote.country || '')}`
      }
    }
  };

  return (
    <>
      <SEOHead {...seoData} />
      <div className="container max-w-4xl mx-auto py-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="w-full" itemScope itemType="https://schema.org/Product">
        <CardHeader>
          <CardTitle className="text-2xl font-bold" itemProp="name">{banknote.denomination} {banknote.country}</CardTitle>
          <CardDescription itemProp="description">{banknote.year} - {banknote.pickNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-[3/2] relative overflow-hidden rounded-md border" itemProp="image" itemScope itemType="https://schema.org/ImageObject">
              <BanknoteImage
                imageUrl={banknote.imageUrls?.[0] || null}
                alt={`${banknote.denomination} ${banknote.country} banknote front side from ${banknote.year} - Pick ${banknote.pickNumber} - ${banknote.authorityName ? `Issued by ${banknote.authorityName}` : 'Ottoman Empire currency'}`}
                className="object-cover"
              />
              <meta itemProp="url" content={banknote.imageUrls?.[0] || ''} />
              <meta itemProp="name" content={`${banknote.denomination} ${banknote.country} Banknote Front`} />
              <meta itemProp="description" content={`${banknote.denomination} ${banknote.country} banknote front side from ${banknote.year} - Pick ${banknote.pickNumber}`} />
              <meta itemProp="caption" content={`${banknote.denomination} ${banknote.country} banknote obverse design`} />
            </div>
            <div className="aspect-[3/2] relative overflow-hidden rounded-md border" itemProp="image" itemScope itemType="https://schema.org/ImageObject">
              <BanknoteImage
                imageUrl={banknote.imageUrls?.[1] || null}
                alt={`${banknote.denomination} ${banknote.country} banknote back side from ${banknote.year} - Pick ${banknote.pickNumber} - ${banknote.authorityName ? `Issued by ${banknote.authorityName}` : 'Ottoman Empire currency'}`}
                className="object-cover"
              />
              <meta itemProp="url" content={banknote.imageUrls?.[1] || ''} />
              <meta itemProp="name" content={`${banknote.denomination} ${banknote.country} Banknote Back`} />
              <meta itemProp="description" content={`${banknote.denomination} ${banknote.country} banknote back side from ${banknote.year} - Pick ${banknote.pickNumber}`} />
              <meta itemProp="caption" content={`${banknote.denomination} ${banknote.country} banknote reverse design`} />
            </div>
          </div>

          <div className="mt-4" itemScope itemType="https://schema.org/Product">
            <h3 className="text-xl font-semibold">Details</h3>
            <Separator className="my-2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Series:</strong> <span itemProp="value">{banknote.series || 'N/A'}</span>
              </div>
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Category:</strong> <span itemProp="value">{banknote.category || 'N/A'}</span>
              </div>
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Type:</strong> <span itemProp="value">{banknote.type || 'N/A'}</span>
              </div>
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Printer:</strong> <span itemProp="value">{banknote.printer || 'N/A'}</span>
              </div>
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Signatures:</strong> <span itemProp="value">{(banknote as any).signatures?.join(', ') || 'N/A'}</span>
              </div>
              <div itemProp="additionalProperty" itemScope itemType="https://schema.org/PropertyValue">
                <strong>Watermark:</strong> <span itemProp="value">{banknote.watermark || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold">Description</h3>
            <Separator className="my-2" />
            <p itemProp="description">{banknote.description || 'No description available.'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default BanknoteDetail;
