
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Play, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processAndUploadImage } from '@/services/imageProcessingService';
import { useToast } from '@/hooks/use-toast';

interface ProcessingStats {
  processed: number;
  skipped: number;
  errors: number;
  total: number;
}

interface CollectionItemData {
  id: string;
  user_id: string;
  obverse_image: string | null;
  reverse_image: string | null;
  obverse_image_watermarked: string | null;
  reverse_image_watermarked: string | null;
  obverse_image_thumbnail: string | null;
  reverse_image_thumbnail: string | null;
}

interface DetailedBanknoteData {
  id: string;
  front_picture: string | null;
  back_picture: string | null;
  front_picture_watermarked: string | null;
  back_picture_watermarked: string | null;
  front_picture_thumbnail: string | null;
  back_picture_thumbnail: string | null;
}

const DeleteProcessedImages: React.FC = () => {
  const { toast } = useToast();
  const [collectionStats, setCollectionStats] = useState<ProcessingStats>({
    processed: 0,
    skipped: 0,
    errors: 0,
    total: 0
  });
  const [banknoteStats, setBanknoteStats] = useState<ProcessingStats>({
    processed: 0,
    skipped: 0,
    errors: 0,
    total: 0
  });
  const [isProcessingCollection, setIsProcessingCollection] = useState(false);
  const [isProcessingBanknotes, setIsProcessingBanknotes] = useState(false);
  const [collectionItems, setCollectionItems] = useState<CollectionItemData[]>([]);
  const [detailedBanknotes, setDetailedBanknotes] = useState<DetailedBanknoteData[]>([]);

  const fetchItemsNeedingProcessing = async () => {
    try {
      // Fetch collection items with images that have watermarked or thumbnail versions
      const { data: collectionData, error: collectionError } = await supabase
        .from('collection_items')
        .select(`
          id, user_id, obverse_image, reverse_image,
          obverse_image_watermarked, reverse_image_watermarked,
          obverse_image_thumbnail, reverse_image_thumbnail
        `)
        .or('obverse_image_watermarked.not.is.null,reverse_image_watermarked.not.is.null,obverse_image_thumbnail.not.is.null,reverse_image_thumbnail.not.is.null');

      if (collectionError) throw collectionError;

      // Filter items that have original images and processed versions
      const filteredCollection = (collectionData || []).filter(item => 
        (item.obverse_image && (item.obverse_image_watermarked || item.obverse_image_thumbnail)) ||
        (item.reverse_image && (item.reverse_image_watermarked || item.reverse_image_thumbnail))
      );

      // Fetch detailed banknotes with images that have watermarked or thumbnail versions
      const { data: banknoteData, error: banknoteError } = await supabase
        .from('detailed_banknotes')
        .select(`
          id, front_picture, back_picture,
          front_picture_watermarked, back_picture_watermarked,
          front_picture_thumbnail, back_picture_thumbnail
        `)
        .or('front_picture_watermarked.not.is.null,back_picture_watermarked.not.is.null,front_picture_thumbnail.not.is.null,back_picture_thumbnail.not.is.null');

      if (banknoteError) throw banknoteError;

      // Filter banknotes that have original images and processed versions
      const filteredBanknotes = (banknoteData || []).filter(item => 
        (item.front_picture && (item.front_picture_watermarked || item.front_picture_thumbnail)) ||
        (item.back_picture && (item.back_picture_watermarked || item.back_picture_thumbnail))
      );

      setCollectionItems(filteredCollection);
      setDetailedBanknotes(filteredBanknotes);

      setCollectionStats(prev => ({ ...prev, total: filteredCollection.length }));
      setBanknoteStats(prev => ({ ...prev, total: filteredBanknotes.length }));

    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items for processing",
        variant: "destructive"
      });
    }
  };

  const processCollectionItems = async () => {
    setIsProcessingCollection(true);
    const stats = { processed: 0, skipped: 0, errors: 0, total: collectionItems.length };

    for (const item of collectionItems) {
      try {
        let obverseProcessed = null;
        let reverseProcessed = null;

        // Process obverse image if it exists and has processed versions
        if (item.obverse_image && (item.obverse_image_watermarked || item.obverse_image_thumbnail)) {
          try {
            const response = await fetch(item.obverse_image);
            const blob = await response.blob();
            const file = new File([blob], 'obverse.jpg', { type: blob.type });
            obverseProcessed = await processAndUploadImage(file, 'collection-items', item.user_id);
          } catch (error) {
            console.error('Error processing obverse image:', error);
          }
        }

        // Process reverse image if it exists and has processed versions
        if (item.reverse_image && (item.reverse_image_watermarked || item.reverse_image_thumbnail)) {
          try {
            const response = await fetch(item.reverse_image);
            const blob = await response.blob();
            const file = new File([blob], 'reverse.jpg', { type: blob.type });
            reverseProcessed = await processAndUploadImage(file, 'collection-items', item.user_id);
          } catch (error) {
            console.error('Error processing reverse image:', error);
          }
        }

        // Update the database with new processed images
        if (obverseProcessed || reverseProcessed) {
          const updateData: any = {};
          
          if (obverseProcessed) {
            updateData.obverse_image_watermarked = obverseProcessed.watermarked;
            updateData.obverse_image_thumbnail = obverseProcessed.thumbnail;
          }
          
          if (reverseProcessed) {
            updateData.reverse_image_watermarked = reverseProcessed.watermarked;
            updateData.reverse_image_thumbnail = reverseProcessed.thumbnail;
          }

          const { error } = await supabase
            .from('collection_items')
            .update(updateData)
            .eq('id', item.id);

          if (error) throw error;
          stats.processed++;
        } else {
          stats.skipped++;
        }

      } catch (error) {
        console.error('Error processing collection item:', error);
        stats.errors++;
      }

      setCollectionStats({ ...stats });
    }

    setIsProcessingCollection(false);
    toast({
      title: "Collection Items Processing Complete",
      description: `Processed: ${stats.processed}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    });
  };

  const processDetailedBanknotes = async () => {
    setIsProcessingBanknotes(true);
    const stats = { processed: 0, skipped: 0, errors: 0, total: detailedBanknotes.length };

    for (const banknote of detailedBanknotes) {
      try {
        let frontProcessed = null;
        let backProcessed = null;

        // Process front image if it exists and has processed versions
        if (banknote.front_picture && (banknote.front_picture_watermarked || banknote.front_picture_thumbnail)) {
          try {
            const response = await fetch(banknote.front_picture);
            const blob = await response.blob();
            const file = new File([blob], 'front.jpg', { type: blob.type });
            frontProcessed = await processAndUploadImage(file, 'detailed-banknotes', 'system');
          } catch (error) {
            console.error('Error processing front image:', error);
          }
        }

        // Process back image if it exists and has processed versions
        if (banknote.back_picture && (banknote.back_picture_watermarked || banknote.back_picture_thumbnail)) {
          try {
            const response = await fetch(banknote.back_picture);
            const blob = await response.blob();
            const file = new File([blob], 'back.jpg', { type: blob.type });
            backProcessed = await processAndUploadImage(file, 'detailed-banknotes', 'system');
          } catch (error) {
            console.error('Error processing back image:', error);
          }
        }

        // Update the database with new processed images
        if (frontProcessed || backProcessed) {
          const updateData: any = {};
          
          if (frontProcessed) {
            updateData.front_picture_watermarked = frontProcessed.watermarked;
            updateData.front_picture_thumbnail = frontProcessed.thumbnail;
          }
          
          if (backProcessed) {
            updateData.back_picture_watermarked = backProcessed.watermarked;
            updateData.back_picture_thumbnail = backProcessed.thumbnail;
          }

          const { error } = await supabase
            .from('detailed_banknotes')
            .update(updateData)
            .eq('id', banknote.id);

          if (error) throw error;
          stats.processed++;
        } else {
          stats.skipped++;
        }

      } catch (error) {
        console.error('Error processing detailed banknote:', error);
        stats.errors++;
      }

      setBanknoteStats({ ...stats });
    }

    setIsProcessingBanknotes(false);
    toast({
      title: "Detailed Banknotes Processing Complete",
      description: `Processed: ${stats.processed}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    });
  };

  const resetStats = () => {
    setCollectionStats({ processed: 0, skipped: 0, errors: 0, total: 0 });
    setBanknoteStats({ processed: 0, skipped: 0, errors: 0, total: 0 });
    setCollectionItems([]);
    setDetailedBanknotes([]);
  };

  useEffect(() => {
    fetchItemsNeedingProcessing();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reprocess Images</h1>
          <p className="text-muted-foreground mt-2">
            Regenerate watermarked and thumbnail versions for existing images
          </p>
        </div>
        <Button
          onClick={fetchItemsNeedingProcessing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Stats
        </Button>
      </div>

      {/* Collection Items Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Collection Items</CardTitle>
            <p className="text-muted-foreground">
              Total items with processed images: {collectionStats.total} | Need reprocessing: {collectionItems.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setCollectionStats({ processed: 0, skipped: 0, errors: 0, total: collectionStats.total });
              }}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={processCollectionItems}
              disabled={isProcessingCollection || collectionItems.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Process
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Processed: {collectionStats.processed}
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              Skipped: {collectionStats.skipped}
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Errors: {collectionStats.errors}
            </Badge>
          </div>
          {isProcessingCollection && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((collectionStats.processed + collectionStats.skipped + collectionStats.errors) / collectionStats.total) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Processing... {collectionStats.processed + collectionStats.skipped + collectionStats.errors} / {collectionStats.total}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Banknotes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Banknotes</CardTitle>
            <p className="text-muted-foreground">
              Total items with processed images: {banknoteStats.total} | Need reprocessing: {detailedBanknotes.length}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setBanknoteStats({ processed: 0, skipped: 0, errors: 0, total: banknoteStats.total });
              }}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={processDetailedBanknotes}
              disabled={isProcessingBanknotes || detailedBanknotes.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Process
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Processed: {banknoteStats.processed}
            </Badge>
            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
              Skipped: {banknoteStats.skipped}
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Errors: {banknoteStats.errors}
            </Badge>
          </div>
          {isProcessingBanknotes && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((banknoteStats.processed + banknoteStats.skipped + banknoteStats.errors) / banknoteStats.total) * 100}%`
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Processing... {banknoteStats.processed + banknoteStats.skipped + banknoteStats.errors} / {banknoteStats.total}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteProcessedImages;
