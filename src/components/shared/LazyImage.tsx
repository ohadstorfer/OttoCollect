import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/placeholder.svg',
  fallback = '/placeholder.svg',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load images 50px before they come into view
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallback : src;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-muted", className)}
    >
      {/* Placeholder/Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
          <div className="animate-pulse bg-muted-foreground/20 rounded-lg w-12 h-8" />
        </div>
      )}

      {/* Progressive image loading */}
      {isInView && (
        <>
          {/* Low quality placeholder */}
          {!isLoaded && (
            <img
              src={placeholder}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 opacity-60",
                className
              )}
            />
          )}

          {/* Main image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-500",
              isLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
};

export default LazyImage;