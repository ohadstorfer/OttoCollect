
import React, { useState } from 'react';
import { ImageUrls } from '@/types/banknote';
import { BanknoteImage } from '@/components/use-banknote-image';

interface BanknoteImageGalleryProps {
  images: ImageUrls;
}

const BanknoteImageGallery = ({ images }: BanknoteImageGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Convert images to array for consistent handling
  const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
  
  // If no images provided, show placeholder
  if (imageArray.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400">No images available</p>
      </div>
    );
  }

  // If only one image, just show it without thumbnails
  if (imageArray.length === 1) {
    return (
      <div className="aspect-[4/3] overflow-hidden">
        <BanknoteImage 
          imageUrl={imageArray} 
          alt="Banknote" 
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[4/3] overflow-hidden bg-gray-50 border border-gray-100">
        <BanknoteImage 
          imageUrl={imageArray[activeIndex] || ''} 
          alt={`Banknote view ${activeIndex + 1}`}
          className="w-full h-full object-contain"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 p-2">
        {imageArray.map((image, index) => (
          <button 
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-16 h-16 overflow-hidden border-2 ${
              index === activeIndex ? 'border-ottoman-600' : 'border-transparent'
            }`}
          >
            <BanknoteImage 
              imageUrl={image} 
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BanknoteImageGallery;
