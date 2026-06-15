import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface ImagePreviewProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = "Image preview",
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset zoom indicator whenever a new image is opened
  useEffect(() => {
    setScale(1);
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  // Calculate dynamic dimensions based on image and device
  const getDialogStyle = () => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return {
        width: isMobile ? '95vw' : 'auto',
        height: isMobile ? '90vh' : '90vh',
        maxWidth: isMobile ? '95vw' : '85vw',
        maxHeight: '90vh'
      };
    }

    const aspectRatio = imageDimensions.height / imageDimensions.width;
    const isHorizontal = imageDimensions.width > imageDimensions.height;

    if (isMobile) {
      // Mobile: Height determined by image height (without zoom consideration)
      const containerWidth = window.innerWidth * 0.95;
      const imageHeight = containerWidth * aspectRatio; // Remove scale factor
      const totalHeight = Math.min(imageHeight + 60, window.innerHeight * 0.9);

      return {
        width: '95vw',
        height: `${totalHeight}px`,
        maxWidth: '95vw',
        maxHeight: '90vh'
      };
    } else {
      // Desktop: Both width and height determined by image (without zoom consideration)
      const maxContainerWidth = window.innerWidth * 0.85;
      const maxContainerHeight = window.innerHeight * 0.9;

      let containerWidth, containerHeight;

      if (isHorizontal) {
        // Horizontal image: fit to width, height follows
        containerWidth = Math.min(maxContainerWidth, 1200);
        containerHeight = containerWidth * aspectRatio; // Remove scale factor

        // If height exceeds max, scale down proportionally
        if (containerHeight > maxContainerHeight) {
          const scaleFactor = maxContainerHeight / containerHeight;
          containerWidth *= scaleFactor;
          containerHeight = maxContainerHeight;
        }
      } else {
        // Vertical image: fit to height, width follows
        containerHeight = Math.min(maxContainerHeight, 800);
        containerWidth = containerHeight / aspectRatio; // Remove scale factor

        // If width exceeds max, scale down proportionally
        if (containerWidth > maxContainerWidth) {
          const scaleFactor = maxContainerWidth / containerWidth;
          containerHeight *= scaleFactor;
          containerWidth = maxContainerWidth;
        }
      }

      return {
        width: `${containerWidth}px`,
        height: `${containerHeight + 60}px`, // Add space for controls
        maxWidth: '85vw',
        maxHeight: '90vh'
      };
    }
  };

  return (
    <Dialog open={!!src} onOpenChange={() => onClose()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden rounded-none sm:rounded-none"
        style={getDialogStyle()}
      >
        {/*
          react-zoom-pan-pinch owns all the zoom/pan gestures. It sets
          `touch-action: none` on its wrapper, so a pinch over the image
          zooms ONLY the image — it never falls through to the browser's
          page zoom. Panning is bound to the image so the user can drag to
          see every part of it without losing it off-screen.
        */}
        <TransformWrapper
          key={src ?? ''}
          initialScale={1}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          centerOnInit
          centerZoomedOut
          limitToBounds
          doubleClick={{ mode: 'toggle', step: 1 }}
          wheel={{ step: 0.15 }}
          pinch={{ step: 5 }}
          onTransformed={(_ref, state) => setScale(state.scale)}
        >
          {({ zoomIn, zoomOut }) => (
            <>
              <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => zoomOut()}
                  disabled={scale <= MIN_SCALE}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                {!isMobile && (
                  <span className="text-sm px-2">
                    {Math.round(scale * 100)}%
                  </span>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => zoomIn()}
                  disabled={scale >= MAX_SCALE}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%', touchAction: 'none' }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={src || ''}
                  alt={alt}
                  onLoad={handleImageLoad}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreview;
