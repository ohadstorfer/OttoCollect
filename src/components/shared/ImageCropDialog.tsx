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

  // Function to handle single rotation step
  const handleSingleRotation = (direction: 'left' | 'right') => {
    setRotation(prev => direction === 'left' ? prev - 1 : prev + 1);
  };

  const startRotation = (direction: 'left' | 'right') => {
    // Clear any existing interval
    if (rotationInterval.current) {
      clearInterval(rotationInterval.current);
    }
  
    // Initial rotation
    handleSingleRotation(direction);
  
    // Initial interval (slow start)
    let currentInterval = 300;
    const minInterval = 20;
  
    const startTime = Date.now();
  
    const updateRotation = () => {
      handleSingleRotation(direction);
  
      const elapsedTime = Date.now() - startTime;
      const newInterval = Math.max(
        minInterval,
        300 - Math.floor(elapsedTime / 200) * 40
      );
  
      if (newInterval !== currentInterval) {
        currentInterval = newInterval;
        clearInterval(rotationInterval.current!);
        rotationInterval.current = setInterval(updateRotation, currentInterval);
      }
    };
  
    // Start with slow interval
    rotationInterval.current = setInterval(updateRotation, currentInterval);
  };
  

  // Function to handle pointer down (works for both mouse and touch)
  const handlePointerDown = (direction: 'left' | 'right') => {
    startRotation(direction);
  };

  // Function to handle pointer up (works for both mouse and touch)
  const handlePointerUp = () => {
    stopRotation();
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
    // console.log('Image loaded, getting dimensions');
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageLoaded(true);
    // console.log('Image dimensions set:', { width: img.naturalWidth, height: img.naturalHeight });
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
    if (!imgRef.current || !crop) {
      return;
    }

    try {
      setLoading(true);
      const image = imgRef.current;

      // Calculate base scaling factors
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // When zoomed out (scale < 1), the visible area is larger than the display area
      const visibleWidth = image.width / scale;
      const visibleHeight = image.height / scale;

      // Calculate the visible area coordinates in the original image space
      const pixelCrop = {
        // When zoomed out, we need to capture a larger area centered on the display
        width: visibleWidth * scaleX,
        height: visibleHeight * scaleY,
        // Calculate the starting point to center the larger area
        x: ((image.width - visibleWidth) / 2) * scaleX,
        y: ((image.height - visibleHeight) / 2) * scaleY
      };

      console.log('scale', scale);
      console.log('image dimensions', { width: image.width, height: image.height });
      console.log('visible dimensions', { width: visibleWidth, height: visibleHeight });
      console.log('scaleX', scaleX, 'scaleY', scaleY);
      console.log('crop', crop);
      console.log('pixelCrop', pixelCrop);

      // Create a canvas for the cropped area
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d', {
        willReadFrequently: false
      });

      if (!cropCtx) {
        throw new Error('No 2d context');
      }

      // Set canvas size to match the visible area
      if (rotation !== 0) {
        // For rotated images, we need a larger canvas
        const rotatedSize = Math.ceil(Math.sqrt(
          Math.pow(pixelCrop.width, 2) + Math.pow(pixelCrop.height, 2)
        ));
        
        cropCanvas.width = rotatedSize;
        cropCanvas.height = rotatedSize;

        // Move to center of canvas
        cropCtx.translate(rotatedSize / 2, rotatedSize / 2);

        // Rotate around center
        cropCtx.rotate((rotation * Math.PI) / 180);

        // Move back so the crop area is centered
        cropCtx.translate(-pixelCrop.width / 2, -pixelCrop.height / 2);
      } else {
        // No rotation, use the visible dimensions
        cropCanvas.width = pixelCrop.width;
        cropCanvas.height = pixelCrop.height;
      }

      // Enable high quality image scaling
      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';

      // Draw the image
      if (rotation !== 0) {
        // For rotated images, draw the cropped portion
        cropCtx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        // Create final canvas for the actual crop size
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
      
        if (!finalCtx) {
          throw new Error('No 2d context');
        }

        finalCanvas.width = pixelCrop.width;
        finalCanvas.height = pixelCrop.height;

        // Calculate where to draw from the rotated canvas
        const startX = (cropCanvas.width - pixelCrop.width) / 2;
        const startY = (cropCanvas.height - pixelCrop.height) / 2;

        // Draw the cropped and rotated portion
        finalCtx.drawImage(
          cropCanvas,
          startX,
          startY,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        // Convert to blob with maximum quality
        const blob = await new Promise<Blob>((resolve, reject) => {
          finalCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            1.0
          );
        });

        const croppedImageUrl = URL.createObjectURL(blob);
        await onSave(croppedImageUrl);
      } else {
        // For non-rotated images, draw directly
        cropCtx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        // Convert to blob with maximum quality
        const blob = await new Promise<Blob>((resolve, reject) => {
          cropCanvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            1.0
          );
        });

        const croppedImageUrl = URL.createObjectURL(blob);
        await onSave(croppedImageUrl);
      }
      
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
        if (!isOpen && !loading) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl"> <span> {title} </span> </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="relative flex justify-center items-center bg-muted rounded-lg overflow-hidden">
            {imageLoaded ? (
              <ReactCrop
                crop={crop}
                onChange={(c) => {
                  setCrop(c);
                }}
                className="max-h-[50vh] sm:max-h-[60vh] w-auto"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                  style={{ 
                    maxHeight: '50vh',
                    width: 'auto',
                    transform: `rotate(${rotation}deg) scale(${scale})`,
                    transition: 'transform 0.1s ease'
                  }}
                  className="object-contain"
                />
              </ReactCrop>
            ) : (
              <div className="w-full h-[50vh] sm:h-[60vh] flex items-center justify-center">
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

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
            <div className="flex gap-2 items-center w-full sm:w-auto">
              {/* Rotation Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 touch-none" // Added touch-none to prevent default touch behavior
                  onPointerDown={() => handlePointerDown('left')}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  disabled={loading}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 touch-none" // Added touch-none to prevent default touch behavior
                  onPointerDown={() => handlePointerDown('right')}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  disabled={loading}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {rotation}°
                </span>
              </div>

              <div className="border-l mx-2 h-6" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8" // Larger touch target on mobile
                  onClick={() => handleZoom('out')}
                  disabled={loading || scale <= 0.1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8" // Larger touch target on mobile
                  onClick={() => handleZoom('in')}
                  disabled={loading || scale >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {Math.round(scale * 100)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 sm:flex-initial"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleSave}
                disabled={loading || !crop}
                className="flex-1 sm:flex-initial"
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