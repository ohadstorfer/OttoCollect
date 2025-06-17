import React, { useState, useRef, useEffect } from 'react';
import { ReactCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';

interface ImageCropDialogProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (croppedImageUrl: string) => Promise<void>;
  title?: string;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  imageUrl,
  open,
  onClose,
  onSave,
  title = 'Edit Image'
}) => {
  console.log('ImageCropDialog rendered with props:', { imageUrl, open, title });
  
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const rotationInterval = useRef<NodeJS.Timeout>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      console.log('Dialog opened, resetting state');
      setRotation(0);
      setScale(1);
      setImageLoaded(false);
      setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0
      });
    }
  }, [open]);

  // Function to handle continuous rotation
  const startRotation = (direction: 'left' | 'right') => {
    console.log('Starting rotation:', direction);
    // Initial rotation
    setRotation(prev => direction === 'left' ? prev - 1 : prev + 1);

    // Set up continuous rotation
    rotationInterval.current = setInterval(() => {
      setRotation(prev => direction === 'left' ? prev - 1 : prev + 1);
    }, 100); // Adjust speed by changing interval (lower = faster)
  };

  const stopRotation = () => {
    console.log('Stopping rotation');
    if (rotationInterval.current) {
      clearInterval(rotationInterval.current);
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up rotation interval');
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
      }
    };
  }, []);

  // Handle image load to get natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Image loaded, getting dimensions');
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageLoaded(true);
    console.log('Image dimensions set:', { width: img.naturalWidth, height: img.naturalHeight });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prevScale => {
      const step = 0.1;
      const newScale = direction === 'in' ? prevScale + step : prevScale - step;
      // Limit scale between 0.1 and 3
      return Math.max(0.1, Math.min(3, newScale));
    });
  };

  const handleSave = async () => {
    console.log('handleSave called, checking conditions');
    if (!imgRef.current || !crop) {
      console.log('Missing required refs or crop:', { imgRef: !!imgRef.current, crop });
      return;
    }

    try {
      setLoading(true);
      console.log('Starting image processing');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }

      // Create a temporary image to handle rotation
      console.log('Creating temporary image for rotation');
      const tempImage = new Image();
      tempImage.crossOrigin = 'anonymous';
      tempImage.src = imageUrl.includes('?') 
        ? `${imageUrl}&_=${Date.now()}` 
        : `${imageUrl}?_=${Date.now()}`;
      
      await new Promise((resolve, reject) => {
        tempImage.onload = () => {
          console.log('Temporary image loaded successfully');
          resolve(null);
        };
        tempImage.onerror = (error) => {
          console.error('Error loading temporary image:', error);
          reject(error);
        };
      });

      // Calculate the bounding box of the rotated image
      const radians = (rotation * Math.PI) / 180;
      console.log('Applying rotation:', { degrees: rotation, radians });
      
      // Set canvas size to fit the cropped area
      canvas.width = crop.width;
      canvas.height = crop.height;
      console.log('Canvas size set to:', { width: crop.width, height: crop.height });

      // Clear the canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling factors
      const scaleX = tempImage.naturalWidth / imgRef.current.width;
      const scaleY = tempImage.naturalHeight / imgRef.current.height;
      console.log('Scaling factors calculated:', { scaleX, scaleY });

      // Create a temporary canvas for rotation
      const rotationCanvas = document.createElement('canvas');
      const rotationCtx = rotationCanvas.getContext('2d');
      if (!rotationCtx) {
        console.error('Failed to get rotation canvas context');
        return;
      }

      // Set the rotation canvas size
      rotationCanvas.width = tempImage.naturalWidth;
      rotationCanvas.height = tempImage.naturalHeight;
      console.log('Rotation canvas size set to:', { width: rotationCanvas.width, height: rotationCanvas.height });

      // Apply rotation
      rotationCtx.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
      rotationCtx.rotate(radians);
      rotationCtx.translate(-rotationCanvas.width / 2, -rotationCanvas.height / 2);

      // Draw the full image rotated
      rotationCtx.drawImage(tempImage, 0, 0);
      console.log('Image drawn with rotation');

      // Draw the cropped portion
      ctx.drawImage(
        rotationCanvas,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Set canvas dimensions to match the original crop size
      const originalWidth = crop.width;
      const originalHeight = crop.height;
      
      // Create a new canvas for final sizing
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = originalWidth;
      finalCanvas.height = originalHeight;
      
      // Draw the cropped image at original size
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        throw new Error('Failed to get final canvas context');
      }
      
      finalCtx.drawImage(canvas, 0, 0, originalWidth, originalHeight);
      console.log('Final image dimensions:', { width: originalWidth, height: originalHeight });

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          finalCanvas.toBlob((blob) => {
            if (blob) {
              console.log('Successfully created blob');
              resolve(blob);
            }
            else {
              console.error('Failed to create blob - blob is null');
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.95);
        } catch (error) {
          console.error('Error in toBlob:', error);
          reject(error);
        }
      });

      // Create URL for preview
      const croppedImageUrl = URL.createObjectURL(blob);
      console.log('Created object URL for cropped image');
      
      await onSave(croppedImageUrl);
      console.log('Save completed successfully');
      onClose();
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast.error('Failed to save image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        console.log('Dialog onOpenChange:', { isOpen, loading });
        if (!isOpen && !loading) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative flex justify-center items-center bg-muted rounded-lg overflow-hidden">
            {imageLoaded ? (
              <ReactCrop
                crop={crop}
                onChange={(c) => {
                  console.log('Crop changed:', c);
                  setCrop(c);
                }}
                className="max-h-[60vh] w-auto"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                  style={{ 
                    maxHeight: '60vh',
                    width: 'auto',
                    transform: `rotate(${rotation}deg) scale(${scale})`,
                    transition: 'transform 0.1s ease'
                  }}
                  className="object-contain"
                />
              </ReactCrop>
            ) : (
              <div className="w-full h-[60vh] flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Loading preview"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                  className="hidden"
                />
                <span>Loading image...</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onMouseDown={() => startRotation('left')}
                onMouseUp={stopRotation}
                onMouseLeave={stopRotation}
                onTouchStart={() => startRotation('left')}
                onTouchEnd={stopRotation}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onMouseDown={() => startRotation('right')}
                onMouseUp={stopRotation}
                onMouseLeave={stopRotation}
                onTouchStart={() => startRotation('right')}
                onTouchEnd={stopRotation}
                disabled={loading}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {rotation}°
              </span>

              <div className="border-l mx-2 h-6" />

              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom('out')}
                disabled={loading || scale <= 0.1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleZoom('in')}
                disabled={loading || scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={loading || !crop}
              >
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog; 