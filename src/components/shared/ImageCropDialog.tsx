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

      // First, create a canvas that applies rotation and scaling to the full image
      const transformCanvas = document.createElement('canvas');
      const transformCtx = transformCanvas.getContext('2d');

      if (!transformCtx) {
        throw new Error('No 2d context');
      }

      // Calculate dimensions after rotation
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      
      // Natural dimensions scaled by the scale factor
      const scaledWidth = image.naturalWidth * scale;
      const scaledHeight = image.naturalHeight * scale;
      
      // Canvas size after rotation
      const rotatedWidth = scaledWidth * cos + scaledHeight * sin;
      const rotatedHeight = scaledWidth * sin + scaledHeight * cos;

      transformCanvas.width = rotatedWidth;
      transformCanvas.height = rotatedHeight;

      // Enable high quality rendering
      transformCtx.imageSmoothingEnabled = true;
      transformCtx.imageSmoothingQuality = 'high';

      // Apply transformations
      transformCtx.save();
      transformCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      transformCtx.rotate(radians);
      transformCtx.scale(scale, scale);
      transformCtx.drawImage(
        image,
        -image.naturalWidth / 2,
        -image.naturalHeight / 2,
        image.naturalWidth,
        image.naturalHeight
      );
      transformCtx.restore();

      // Now apply the crop
      // The crop coordinates are percentages of the displayed image size
      // We need to map these to the transformed canvas
      const displayedImageRect = image.getBoundingClientRect();
      const displayedWidth = image.offsetWidth;
      const displayedHeight = image.offsetHeight;

      // Calculate how the displayed image maps to our transformed canvas
      // The displayed image is the transformed image scaled to fit the display area
      const displayScale = Math.min(
        displayedWidth / rotatedWidth,
        displayedHeight / rotatedHeight
      );

      // Calculate the actual displayed size of the transformed image
      const actualDisplayWidth = rotatedWidth * displayScale;
      const actualDisplayHeight = rotatedHeight * displayScale;

      // Calculate crop area in transformed canvas coordinates
      const cropX = (crop.x / 100) * actualDisplayWidth / displayScale;
      const cropY = (crop.y / 100) * actualDisplayHeight / displayScale;
      const cropWidth = (crop.width / 100) * actualDisplayWidth / displayScale;
      const cropHeight = (crop.height / 100) * actualDisplayHeight / displayScale;

      // Create the final output canvas
      const outputCanvas = document.createElement('canvas');
      const outputCtx = outputCanvas.getContext('2d');

      if (!outputCtx) {
        throw new Error('No 2d context for output');
      }

      outputCanvas.width = cropWidth;
      outputCanvas.height = cropHeight;

      // Enable high quality scaling for output
      outputCtx.imageSmoothingEnabled = true;
      outputCtx.imageSmoothingQuality = 'high';

      // Draw the cropped area
      outputCtx.drawImage(
        transformCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Convert to blob with high quality
      const blob = await new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          0.95
        );
      });

      const croppedImageUrl = URL.createObjectURL(blob);
      await onSave(croppedImageUrl);
      
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