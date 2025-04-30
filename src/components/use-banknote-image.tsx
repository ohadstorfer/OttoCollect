
import React from 'react';
import { ImageUrls } from '@/types/banknote';
import { normalizeImageUrls } from '@/utils/imageHelpers';

interface BanknoteImageProps extends React.HTMLAttributes<HTMLImageElement> {
  imageUrl: ImageUrls | null;
  alt?: string;
  className?: string;
}

export const BanknoteImage: React.FC<BanknoteImageProps> = ({ 
  imageUrl, 
  alt = "Banknote", 
  className, 
  ...props 
}) => {
  // Handle null, undefined or empty imageUrl cases
  if (!imageUrl) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">No image</span>
      </div>
    );
  }
  
  // Normalize image URLs into an array
  const imageUrls = normalizeImageUrls(imageUrl, '/placeholder-brown.svg');
  const src = imageUrls[0]; // Use first image
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/placeholder-brown.svg';
      }}
      {...props}
    />
  );
};
