
import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { X } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (!images || images.length === 0) return null;
  
  const openLightbox = (image: string) => setSelectedImage(image);
  const closeLightbox = () => setSelectedImage(null);
  
  // Different layouts based on image count - more compact for forum
  const getGalleryLayout = () => {
    if (images.length === 1) {
      return (
        <div 
          className="max-w-xs cursor-pointer rounded-lg overflow-hidden border border-muted hover:border-ottoman-300 transition-colors"
          onClick={() => openLightbox(images[0])}
        >
          <AspectRatio ratio={4/3} className="bg-muted">
            <img 
              src={images[0]} 
              alt="Post image" 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </AspectRatio>
        </div>
      );
    }
    
    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="cursor-pointer rounded-lg overflow-hidden border border-muted hover:border-ottoman-300 transition-colors"
              onClick={() => openLightbox(image)}
            >
              <AspectRatio ratio={1/1} className="bg-muted">
                <img 
                  src={image} 
                  alt={`Post image ${index + 1}`} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </AspectRatio>
            </div>
          ))}
        </div>
      );
    }
    
    if (images.length === 3) {
      return (
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="cursor-pointer rounded-lg overflow-hidden border border-muted hover:border-ottoman-300 transition-colors"
              onClick={() => openLightbox(image)}
            >
              <AspectRatio ratio={1/1} className="bg-muted">
                <img 
                  src={image} 
                  alt={`Post image ${index + 1}`} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </AspectRatio>
            </div>
          ))}
        </div>
      );
    }
    
    // 4 or more images - compact grid
    return (
      <div className="grid grid-cols-4 gap-2 max-w-md">
        {images.slice(0, 4).map((image, index) => (
          <div 
            key={index} 
            className={`cursor-pointer rounded-lg overflow-hidden border border-muted hover:border-ottoman-300 transition-colors relative ${
              index === 3 && images.length > 4 ? 'after:absolute after:inset-0 after:bg-black/60 after:flex after:items-center after:justify-center after:text-white after:font-bold after:text-sm' : ''
            }`}
            onClick={() => openLightbox(image)}
            {...(index === 3 && images.length > 4 
              ? { 'data-more': `+${images.length - 4}` } 
              : {}
            )}
          >
            <AspectRatio ratio={1/1} className="bg-muted">
              <img 
                src={image} 
                alt={`Post image ${index + 1}`} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
              {index === 3 && images.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-sm">
                  +{images.length - 4}
                </div>
              )}
            </AspectRatio>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <div className="my-2 animate-fade-in">
        {getGalleryLayout()}
      </div>
      
      {/* Image lightbox */}
      <Dialog open={!!selectedImage} onOpenChange={() => closeLightbox()}>
        <DialogContent className="max-w-4xl w-[90vw] p-0 bg-transparent border-none">
          <div className="relative bg-black/95 rounded-lg overflow-hidden">
            <button 
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors z-10"
              aria-label="Close lightbox"
            >
              <X size={20} />
            </button>
            
            <div className="flex justify-center items-center min-h-[200px] max-h-[80vh] p-4">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Full size image" 
                  className="max-w-full max-h-[80vh] object-contain animate-scale-in"
                />
              )}
            </div>
            
            {images.length > 1 && (
              <div className="p-4 bg-black/80 flex gap-2 justify-center overflow-x-auto">
                {images.map((image, index) => (
                  <button 
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className={`w-14 h-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === image ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
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

export default ImageGallery;
