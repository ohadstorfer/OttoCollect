
import { normalizeImageUrls, getFirstImageUrl } from '@/utils/imageHelpers';
import { ImageUrls } from '@/types/banknote';

interface BanknoteImageProps {
  imageUrl: ImageUrls | null | undefined;
  alt: string;
  className?: string;
  fallbackImage?: string;
}

export const BanknoteImage: React.FC<BanknoteImageProps> = ({ 
  imageUrl, 
  alt, 
  className = "", 
  fallbackImage = "/placeholder.svg"
}) => {
  // Get the appropriate image URL
  const normalizedUrl = getFirstImageUrl(imageUrl, fallbackImage);
  
  // Handle image loading error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = fallbackImage;
  };

  return (
    <img 
      src={normalizedUrl} 
      alt={alt} 
      className={className}
      onError={handleError}
    />
  );
};

interface BanknoteImageGalleryProps {
  images: ImageUrls | null | undefined;
  alt: string;
  className?: string;
}

export const BanknoteImageGallery: React.FC<BanknoteImageGalleryProps> = ({
  images,
  alt,
  className = ""
}) => {
  const normalizedImages = normalizeImageUrls(images);
  
  return (
    <div className={`grid ${normalizedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 ${className}`}>
      {normalizedImages.map((image, index) => (
        <BanknoteImage 
          key={`${image}-${index}`} 
          imageUrl={image} 
          alt={`${alt} ${index + 1}`} 
          className="w-full h-auto object-cover"
        />
      ))}
    </div>
  );
};
