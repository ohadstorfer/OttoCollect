
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DetailedBanknote } from '@/types';
import { fetchBanknoteDetail } from '@/services/banknoteService';
import { fetchCollectionItem } from '@/services/collectionService';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const BanknoteCollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [banknote, setBanknote] = useState<DetailedBanknote | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadBanknote = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // Fetch the collection item which includes enhanced_detailed_banknotes data
        const collectionItem = await fetchCollectionItem(id);
        if (!collectionItem) {
          throw new Error('Collection item not found');
        }
        
        // Use the enhanced_detailed_banknotes data from the collection item
        if (collectionItem.enhanced_detailed_banknotes) {
          setBanknote(collectionItem.enhanced_detailed_banknotes as DetailedBanknote);
          setFetchError(null);
        } else if (collectionItem.banknote_id) {
          // Fallback: fetch banknote details if enhanced data is not available
          const data = await fetchBanknoteDetail(collectionItem.banknote_id);
          if (data) {
            setBanknote(data as DetailedBanknote);
            setFetchError(null);
          } else {
            throw new Error('Banknote not found');
          }
        } else {
          throw new Error('No banknote data available');
        }
      } catch (error) {
        console.error('Error loading banknote:', error);
        setFetchError(error instanceof Error ? error.message : 'Unknown error');
        toast({
          title: "Error",
          description: "Failed to load banknote",
          variant: "destructive"
        });
        navigate('/collection');
      } finally {
        setLoading(false);
      }
    };

    loadBanknote();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError || !banknote) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{fetchError || "Something went wrong"}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-serif font-semibold">
          {banknote.face_value} ({banknote.country}, {banknote.gregorian_year})
        </h1>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Country:</span>
              <p className="text-sm">{banknote.country || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Denomination:</span>
              <p className="text-sm">{banknote.face_value || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Pick Number:</span>
              <p className="text-sm">{banknote.pick_number || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Extended Pick Number:</span>
              <p className="text-sm">{banknote.extended_pick_number || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Year:</span>
              <p className="text-sm">{banknote.gregorian_year || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Category:</span>
              <p className="text-sm">{banknote.category || '-'}</p>
            </div>
            {banknote.dimensions && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Dimensions:</span>
                <p className="text-sm">{banknote.dimensions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Type:</span>
              <p className="text-sm">{banknote.type || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Printer:</span>
              <p className="text-sm">{banknote.printer || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Rarity:</span>
              <p className="text-sm">{banknote.rarity || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Colors:</span>
              <p className="text-sm">{banknote.colors || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Security Elements:</span>
              <p className="text-sm">{banknote.security_element || '-'}</p>
            </div>
            <div>
              <span className="font-semibold text-sm text-muted-foreground">Serial Numbering:</span>
              <p className="text-sm">{banknote.serial_numbering || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {banknote.banknote_description && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Banknote Description:</span>
                <p className="text-sm whitespace-pre-wrap">{banknote.banknote_description}</p>
              </div>
            )}
            {banknote.historical_description && (
              <div>
                <span className="font-semibold text-sm text-muted-foreground">Historical Description:</span>
                <p className="text-sm whitespace-pre-wrap">{banknote.historical_description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BanknoteCollectionDetail;
