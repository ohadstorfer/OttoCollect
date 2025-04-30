
import { useState, useEffect } from 'react';
import { ImageUrls } from '@/types/banknote';
import { getFirstImageUrl, normalizeImageUrls } from '@/utils/imageHelpers';

interface UseBanknoteImageProps {
  imageUrls: ImageUrls | undefined | null;
  defaultImage?: string;
}

interface UseBanknoteImageResult {
  imageUrl: string;
  imageUrlArray: string[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  isLoading: boolean;
  error: string | null;
}

// Hook for handling banknote images with next/prev functionality
export function useBanknoteImage({
  imageUrls,
  defaultImage = '/placeholder.svg'
}: UseBanknoteImageProps): UseBanknoteImageResult {
  const normalizedImages = normalizeImageUrls(imageUrls, defaultImage);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the current index when imageUrls changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [imageUrls]);

  const nextImage = () => {
    if (normalizedImages.length <= 1) return;
    setCurrentIndex((prevIndex) => 
      prevIndex === normalizedImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    if (normalizedImages.length <= 1) return;
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? normalizedImages.length - 1 : prevIndex - 1
    );
  };

  return {
    imageUrl: normalizedImages[currentIndex] || defaultImage,
    imageUrlArray: normalizedImages,
    currentIndex,
    setCurrentIndex,
    nextImage,
    prevImage,
    isLoading,
    error
  };
}

// Utility component that accepts either string or string[] as imageUrl
export function BanknoteImage({
  imageUrl,
  alt = "Banknote",
  className = "",
  defaultImage = '/placeholder.svg'
}: {
  imageUrl: ImageUrls | undefined | null;
  alt?: string;
  className?: string;
  defaultImage?: string;
}) {
  // Convert string or string[] to a single string (first URL in array)
  const singleImageUrl = getFirstImageUrl(imageUrl, defaultImage);
  
  return (
    <img 
      src={singleImageUrl} 
      alt={alt} 
      className={className}
      onError={(e) => {
        e.currentTarget.src = defaultImage;
      }}
    />
  );
}
