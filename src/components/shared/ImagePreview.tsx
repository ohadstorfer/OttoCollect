import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = "Image preview",
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      const step = 0.25;
      const newScale = direction === 'in' ? prev + step : prev - step;
      // Limit scale between 0.5 and 3
      const limitedScale = Math.max(0.5, Math.min(3, newScale));
      
      // If zooming out to 1 or below, reset position
      if (limitedScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      
      return limitedScale;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale !== 1) {
      // Reset zoom and position
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      // Zoom in to 2x
      setScale(2);
    }
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
        className="p-0 gap-0 overflow-hidden"
        style={getDialogStyle()}
      >
        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom('out')}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleZoom('in')}
            disabled={scale >= 3}
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

        <div 
          className="relative w-full h-full overflow-hidden bg-background/95 cursor-move flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="w-full h-full flex items-center justify-center transition-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
            }}
          >
            <img
              src={src || ''}
              alt={alt}
              onLoad={handleImageLoad}
              className="w-full h-auto transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${scale})`,
                objectFit: 'contain',
                cursor: scale > 1 ? 'grab' : 'default',
              }}
              onDoubleClick={handleDoubleClick}
              draggable={false}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreview;