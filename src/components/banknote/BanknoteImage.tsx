
import React from 'react';
import { getFirstImageUrl } from '@/utils/imageHelpers';
import { ImageUrls } from '@/types/banknote';
import { DEFAULT_IMAGE_URL } from '@/lib/constants';

interface BanknoteImageProps {
  imageUrl: ImageUrls | null | undefined;
  alt?: string;
  className?: string;
  fallback?: string;
  onClick?: () => void;
}

export const BanknoteImage: React.FC<BanknoteImageProps> = ({
  imageUrl,
  alt = "Banknote image",
  className = "w-full h-full object-cover",
  fallback = DEFAULT_IMAGE_URL,
  onClick
}) => {
  console.log("BanknoteImage - Received imageUrl:", {
    imageUrl,
    type: imageUrl ? (typeof imageUrl === 'string' ? 'string' : Array.isArray(imageUrl) ? 'array' : 'other') : 'null/undefined'
  });
  
  const safeImageUrl = getFirstImageUrl(imageUrl, fallback);
  
  console.log("BanknoteImage - Using safeImageUrl:", safeImageUrl);
  
  return (
    <img
      src={safeImageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      loading="lazy"
    />
  );
};

export default BanknoteImage;
