import React from 'react';
import { getFirstImageUrl } from '@/utils/imageHelpers';
import { ImageUrls } from '@/types/banknote';
import { DEFAULT_IMAGE_URL } from '@/lib/constants';
import { ResilientImage } from '@/components/shared/ResilientImage';

interface BanknoteImageProps {
  imageUrl: ImageUrls | null | undefined;
  alt?: string;
  className?: string;
  fallback?: string;
  onClick?: () => void;
  /** Opt out of lazy loading for an above-the-fold image. */
  eager?: boolean;
}

export const BanknoteImage: React.FC<BanknoteImageProps> = ({
  imageUrl,
  alt = "Banknote image",
  className = "w-full h-full object-cover",
  fallback = DEFAULT_IMAGE_URL,
  onClick,
  eager = false,
}) => {
  const safeImageUrl = getFirstImageUrl(imageUrl, fallback);

  // ResilientImage retries a transient Supabase Storage stall before giving up,
  // which is what a bare <img> could not do — see @/lib/imageLoadState.
  return (
    <ResilientImage
      src={safeImageUrl}
      alt={alt}
      className={className}
      fallbackSrc={fallback}
      onClick={onClick}
      eager={eager}
    />
  );
};

export default BanknoteImage;
