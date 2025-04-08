
import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface BanknoteImageGalleryProps {
  images: string[];
}

const BanknoteImageGallery: React.FC<BanknoteImageGalleryProps> = ({ images }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  if (!images || images.length === 0) {
    return null;
  }
  
  const openLightbox = (index: number) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);
  
  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex((prev) => 
        prev === null ? null : prev === 0 ? images.length - 1 : prev - 1
      );
    } else {
      setSelectedImageIndex((prev) => 
        prev === null ? null : prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };
  
  return (
    <>
      <div className="grid grid-cols-2 gap-1 bg-muted/20">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="cursor-pointer overflow-hidden border-2 border-transparent hover:border-ottoman-300 transition-colors"
            onClick={() => openLightbox(index)}
          >
            <AspectRatio ratio={1/1} className="bg-muted">
              <img 
                src={image} 
                alt={`Banknote image ${index + 1}`} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </AspectRatio>
          </div>
        ))}
      </div>
      
      {/* Image lightbox */}
      <Dialog open={selectedImageIndex !== null} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-transparent border-none">
          <div className="relative bg-black/95 rounded-lg overflow-hidden">
            <button 
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10"
              aria-label="Close lightbox"
            >
              <X size={20} />
            </button>
            
            <div className="flex justify-center items-center min-h-[200px] max-h-[80vh] p-6 relative">
              {selectedImageIndex !== null && (
                <img 
                  src={images[selectedImageIndex]} 
                  alt={`Banknote full view ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain animate-scale-in"
                />
              )}
              
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => navigateImage('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => navigateImage('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors" 
                    aria-label="Next image"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="p-4 bg-black/80 flex gap-2 justify-center overflow-x-auto">
                {images.map((image, index) => (
                  <button 
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-14 h-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={image} 
                      alt={`Thumbnail ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BanknoteImageGallery;
