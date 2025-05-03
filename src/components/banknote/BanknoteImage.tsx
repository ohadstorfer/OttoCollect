
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
  const safeImageUrl = getFirstImageUrl(imageUrl, fallback);
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = fallback;
  };
  
  return (
    <img
      src={safeImageUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default BanknoteImage;
