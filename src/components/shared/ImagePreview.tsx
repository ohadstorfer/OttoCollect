import React, { useState } from 'react';
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

  return (
    <Dialog open={!!src} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] p-0 gap-0">
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
          className="relative w-full h-[90vh] overflow-hidden bg-background/95 cursor-move flex items-center justify-center"
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