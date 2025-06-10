import React, { useState, useRef, useEffect } from 'react';
import { ReactCrop, type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, RotateCw, Check, X } from 'lucide-react';
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
  const [crop, setCrop] = useState<Crop>();
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const rotationInterval = useRef<NodeJS.Timeout>();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Function to handle continuous rotation
  const startRotation = (direction: 'left' | 'right') => {
    // Initial rotation
    setRotation(prev => direction === 'left' ? prev - 1 : prev + 1);

    // Set up continuous rotation
    rotationInterval.current = setInterval(() => {
      setRotation(prev => direction === 'left' ? prev - 1 : prev + 1);
    }, 50); // Adjust speed by changing interval (lower = faster)
  };

  const stopRotation = () => {
    if (rotationInterval.current) {
      clearInterval(rotationInterval.current);
    }
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (rotationInterval.current) {
        clearInterval(rotationInterval.current);
      }
    };
  }, []);

  // Handle image load to get natural dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageLoaded(true);
  };

  
  const handleSave = async () => {
    if (!imgRef.current || !crop) return;

    try {
      setLoading(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create a temporary image to handle rotation
      const tempImage = new Image();
      tempImage.crossOrigin = 'anonymous';
      tempImage.src = imageUrl.includes('?') 
        ? `${imageUrl}&_=${Date.now()}` 
        : `${imageUrl}?_=${Date.now()}`;
      
      await new Promise((resolve, reject) => {
        tempImage.onload = resolve;
        tempImage.onerror = reject;
      });

      // Calculate the bounding box of the rotated image
      const radians = (rotation * Math.PI) / 180;
      
      // Set canvas size to fit the cropped area
      canvas.width = crop.width;
      canvas.height = crop.height;

      // Clear the canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate scaling factors based on the displayed image size vs natural size
      const scaleX = tempImage.naturalWidth / imgRef.current.width;
      const scaleY = tempImage.naturalHeight / imgRef.current.height;

      // Create a temporary canvas for rotation
      const rotationCanvas = document.createElement('canvas');
      const rotationCtx = rotationCanvas.getContext('2d');
      if (!rotationCtx) return;

      // Set the rotation canvas size to the full image size
      rotationCanvas.width = tempImage.naturalWidth;
      rotationCanvas.height = tempImage.naturalHeight;

      // Rotate around the center of the full image
      rotationCtx.translate(rotationCanvas.width / 2, rotationCanvas.height / 2);
      rotationCtx.rotate(radians);
      rotationCtx.translate(-rotationCanvas.width / 2, -rotationCanvas.height / 2);

      // Draw the full image rotated
      rotationCtx.drawImage(tempImage, 0, 0);

      // Now draw the cropped portion onto the final canvas
      ctx.drawImage(
        rotationCanvas,
        crop.x * scaleX,  // source x
        crop.y * scaleY,  // source y
        crop.width * scaleX,  // source width
        crop.height * scaleY,  // source height
        0,  // destination x
        0,  // destination y
        crop.width,  // destination width
        crop.height  // destination height
      );

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/jpeg', 0.95);
        } catch (error) {
          reject(error);
        }
      });

      // Create URL for preview
      const croppedImageUrl = URL.createObjectURL(blob);
      
      await onSave(croppedImageUrl);
      onClose();
    } catch (error) {
      console.error('Error saving cropped image:', error);
      toast.error('Failed to save image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="relative flex justify-center items-center bg-muted rounded-lg overflow-hidden">
            {imageLoaded && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
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
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.1s ease'
                  }}
                  className="object-contain"
                />
              </ReactCrop>
            )}
            {!imageLoaded && (
              <img
                src={imageUrl}
                alt="Loading preview"
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                className="hidden"
              />
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