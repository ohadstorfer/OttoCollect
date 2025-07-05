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

  return (
    <div className="container max-w-4xl mx-auto py-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{banknote.denomination} {banknote.country}</CardTitle>
          <CardDescription>{banknote.year} - {banknote.pickNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-[3/2] relative overflow-hidden rounded-md border">
              <BanknoteImage
                imageUrl={banknote.imageUrls?.[0] || null}
                alt={`Front of ${banknote.denomination}`}
                className="object-cover"
              />
            </div>
            <div className="aspect-[3/2] relative overflow-hidden rounded-md border">
              <BanknoteImage
                imageUrl={banknote.imageUrls?.[1] || null}
                alt={`Back of ${banknote.denomination}`}
                className="object-cover"
              />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold">Details</h3>
            <Separator className="my-2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Series:</strong> {banknote.series || 'N/A'}
              </div>
              <div>
                <strong>Category:</strong> {banknote.category || 'N/A'}
              </div>
              <div>
                <strong>Type:</strong> {banknote.type || 'N/A'}
              </div>
              <div>
                <strong>Printer:</strong> {banknote.printer || 'N/A'}
              </div>
              <div>
                <strong>Signatures:</strong> {banknote.signatures?.join(', ') || 'N/A'}
              </div>
              <div>
                <strong>Watermark:</strong> {banknote.watermark || 'N/A'}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold">Description</h3>
            <Separator className="my-2" />
            <p>{banknote.description || 'No description available.'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BanknoteDetail;
