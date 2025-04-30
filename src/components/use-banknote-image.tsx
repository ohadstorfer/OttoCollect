
import React from 'react';
import { ImageUrls } from '@/types/banknote';

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
  
  // Handle both string and string[] image URLs
  const src = Array.isArray(imageUrl) ? imageUrl[0] || '' : imageUrl;
  
  // Handle empty array case
  if (Array.isArray(imageUrl) && imageUrl.length === 0) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">No image</span>
      </div>
    );
  }

  return (
    <img 
      src={src || '/placeholder.svg'} 
      alt={alt} 
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.src = '/placeholder.svg';
      }}
      {...props}
    />
  );
};
