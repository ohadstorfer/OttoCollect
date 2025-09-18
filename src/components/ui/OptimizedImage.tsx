import React, { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  lazy?: boolean;
  width?: number;
  height?: number;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  lazy = true,
  width,
  height,
  placeholder,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && placeholder && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      
      {/* Main image */}
      <img
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        style={{ width, height }}
      />
      
      {/* Error fallback */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-500"
          style={{ width, height }}
        >
          <div className="text-center">
            <div className="text-sm font-semibold">OttoCollect</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
