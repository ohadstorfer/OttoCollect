import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ExternalLink, Share2 } from 'lucide-react';
import { fetchBanknoteById } from '@/services/banknoteService';
import { DetailedBanknote } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { addToCollection } from '@/services/collectionService';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BanknoteCatalogDetailMinimized() {
  const { id } = useParams<{ id: string }>();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadBanknote = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const data = await fetchBanknoteById(id);
        if (data) {
          setBanknote(data);
          // Set the first image as active by default
          if (data.imageUrls && data.imageUrls.length > 0) {
            setActiveImage(data.imageUrls[0]);
          }
        } else {
          setError('Banknote not found');
        }
      } catch (err) {
        console.error('Error loading banknote:', err);
        setError('Failed to load banknote details');
      } finally {
        setLoading(false);
      }
    };

    loadBanknote();
  }, [id]);

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to your collection",
        variant: "destructive",
      });
      return;
    }

    if (!banknote) return;

    try {
      const result = await addToCollection({
        userId: user.id,
        banknoteId: banknote.id,
        grade: 'UNC', // Default grade
        purchaseDate: new Date().toISOString(),
        notes: '',
      });

      if (result) {
        toast({
          title: "Added to Collection",
          description: "The banknote has been added to your collection",
        });
      } else {
        toast({
          title: "Failed to Add",
          description: "Could not add the banknote to your collection",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error adding to collection:', err);
      toast({
        title: "Error",
        description: "An error occurred while adding to your collection",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${banknote?.denomination} ${banknote?.country} Banknote`,
          text: `Check out this ${banknote?.denomination} banknote from ${banknote?.country}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "The link has been copied to your clipboard",
      });
    }
  };

  const openImageModal = (imageUrl: string) => {
    setActiveImage(imageUrl);
    setIsImageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Skeleton className="w-full aspect-[4/3]" />
          </div>
          <div>
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-6 w-2/3 mb-6" />
            <Skeleton className="h-24 w-full mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !banknote) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="mb-6">{error || 'Failed to load banknote details'}</p>
          <Button onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${banknote.denomination} ${banknote.country} Banknote | Ottoman Banknotes`}</title>
        <meta name="description" content={`${banknote.denomination} banknote from ${banknote.country}, ${banknote.year}. ${banknote.description}`} />
        <meta property="og:title" content={`${banknote.denomination} ${banknote.country} Banknote`} />
        <meta property="og:description" content={`${banknote.denomination} banknote from ${banknote.country}, ${banknote.year}`} />
        <meta property="og:image" content={Array.isArray(banknote.front_picture) ? banknote.front_picture[0] : banknote.front_picture} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Catalog
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Banknote Images */}
          <div>
            <div 
              className={cn(
                "border rounded-lg overflow-hidden mb-4 cursor-pointer",
                theme === 'light' ? "bg-white" : "bg-dark-700"
              )}
              onClick={() => activeImage && openImageModal(activeImage)}
            >
              {activeImage && (
                <img 
                  src={activeImage} 
                  alt={`${banknote.denomination} ${banknote.country} banknote`}
                  className="w-full h-auto object-contain aspect-[4/3]"
                />
              )}
            </div>
            
            {/* Thumbnail Gallery */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {banknote.imageUrls.map((url, index) => (
                <div 
                  key={index}
                  className={cn(
                    "border rounded w-20 h-20 flex-shrink-0 cursor-pointer overflow-hidden",
                    activeImage === url ? "border-ottoman-500 border-2" : "border-gray-200",
                    theme === 'light' ? "bg-white" : "bg-dark-700"
                  )}
                  onClick={() => setActiveImage(url)}
                >
                  <img 
                    src={url} 
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Banknote Details */}
          <div>
            <div className="flex flex-wrap items-start justify-between mb-2">
              <h1 className="text-2xl font-bold">
                {banknote.denomination} {banknote.country}
              </h1>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {banknote.year && (
                <Badge variant="outline">{banknote.year}</Badge>
              )}
              {banknote.catalogId && (
                <Badge variant="outline">Pick: {banknote.catalogId}</Badge>
              )}
              {banknote.series && (
                <Badge variant="outline">{banknote.series}</Badge>
              )}
            </div>

            <Separator className="my-4" />
            
            <div className="space-y-4">
              {banknote.description && (
                <div>
                  <h3 className="font-medium mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground">{banknote.description}</p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 mt-6">
                <Button onClick={handleAddToCollection}>
                  Add to My Collection
                </Button>
                <Link to={`/catalog/banknote/${id}`}>
                  <Button variant="outline" className="flex items-center gap-1">
                    View Full Details
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Banknote Image</DialogTitle>
            <DialogDescription>
              {banknote.denomination} {banknote.country} ({banknote.year})
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center">
            {activeImage && (
              <img 
                src={activeImage} 
                alt={`${banknote.denomination} ${banknote.country} banknote`}
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
